// Full NextAuth wiring (Node runtime only).
// Edge middleware uses auth.config.ts directly; everything else goes through
// the helpers exported here.
//
// HIPAA-relevant defaults (set in auth.config.ts):
//  - Database sessions, 24h absolute cap, 15-min idle bump
//  - LOGIN/LOGOUT events recorded to AuditLog via events callbacks below
//  - In dev, magic links are console.log'd. In prod, sent via SES SMTP.

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import authConfig from "./auth.config";
import { prisma } from "./db";
import { audit } from "./audit";

// Module augmentation — minimal Session shape. Org/role/membership are
// loaded fresh from Prisma in requireSession() (rbac.ts) so the auth
// cookie stays small and we always read current role state.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

// Custom send — dev = console, prod = SES via nodemailer SMTP.
async function sendMagicLink(params: {
  identifier: string;
  url: string;
  from: string;
}) {
  const { identifier, url, from } = params;
  const transport = process.env.EMAIL_TRANSPORT ?? "console";

  const subject = "Watermelon · Sign in to your account";
  const text = [
    "Sign in to Watermelon by clicking the link below:",
    "",
    url,
    "",
    "This link expires in 15 minutes and can only be used once.",
    "If you didn't request it, you can safely ignore this email.",
  ].join("\n");

  if (transport === "console") {
    // eslint-disable-next-line no-console
    console.log("\n" + "═".repeat(70));
    console.log(`📬 MAGIC LINK for ${identifier}`);
    console.log("─".repeat(70));
    console.log(url);
    console.log("═".repeat(70) + "\n");
    return;
  }

  const nodemailer = await import("nodemailer");
  const tx = nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST,
    port: Number(process.env.SES_SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SES_SMTP_USER, pass: process.env.SES_SMTP_PASS },
  });
  await tx.sendMail({ from, to: identifier, subject, text });
}

const DEMO_EMAIL = "owner@watermelon-therapy.example.com";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Nodemailer({
      server: { host: "localhost", port: 1025, auth: { user: "", pass: "" } },
      from: process.env.EMAIL_FROM ?? "Watermelon <noreply@watermelon.app>",
      maxAge: 15 * 60,
      sendVerificationRequest({ identifier, url, provider }) {
        return sendMagicLink({
          identifier,
          url,
          from: typeof provider.from === "string" ? provider.from : "Watermelon <noreply@watermelon.app>",
        });
      },
    }),
    // Demo-only credentials provider — instantly signs in as the demo coordinator.
    // Only accepts the seeded demo email; safe to expose since all data is fake.
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: { email: { label: "Email", type: "text" } },
      async authorize(credentials) {
        const email = (credentials?.email as string) ?? DEMO_EMAIL;
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true },
        });
        return user ?? null;
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await audit({
        userId: user.id,
        action: "LOGIN",
        resourceType: "User",
        resourceId: user.id,
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() },
      });
    },
    async signOut(message) {
      const userId = "session" in message ? message.session?.userId : undefined;
      if (!userId) return;
      await audit({
        userId,
        action: "LOGOUT",
        resourceType: "User",
        resourceId: userId,
      });
    },
  },
});
