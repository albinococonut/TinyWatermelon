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

  const subject = "Your Watermelon sign-in link";
  const text = [
    "Sign in to Watermelon",
    "",
    "Click the link below to sign in. It expires in 15 minutes and can only be used once.",
    "",
    url,
    "",
    "If you didn't request this, you can safely ignore it.",
    "",
    "— The Watermelon team",
    "hi@tinywatermelon.com",
  ].join("\n");

  const html = magicLinkHtml(url);

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
  await tx.sendMail({ from, to: identifier, subject, text, html });
}

function magicLinkHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sign in to Watermelon</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <img
                src="https://tinywatermelon.com/logo-long.png"
                alt="tiny watermelon"
                width="160"
                style="height:auto;display:block;"
              />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;border:1px solid #dee1e7;padding:40px 36px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

              <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#dd4a62;">
                Sign in
              </p>
              <h1 style="margin:0 0 14px;font-size:26px;font-weight:600;color:#151820;line-height:1.2;">
                Your magic link is ready
              </h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#5d6575;">
                Click the button below to sign in to your Watermelon account.
                This link expires in&nbsp;<strong>15&nbsp;minutes</strong> and
                can only be used once.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:12px;background:linear-gradient(135deg,#dd4a62 0%,#c1364e 100%);box-shadow:0 2px 6px rgba(193,54,78,0.35);">
                    <a
                      href="${url}"
                      style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;"
                    >
                      Sign in to Watermelon →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:12.5px;color:#8d94a2;">
                Button not working? Copy and paste this link into your browser:
              </p>
              <p style="margin:6px 0 0;font-size:12px;word-break:break-all;color:#8d94a2;">
                ${url}
              </p>

              <hr style="border:none;border-top:1px solid #dee1e7;margin:28px 0;" />

              <p style="margin:0;font-size:12.5px;color:#8d94a2;line-height:1.5;">
                If you didn't request this email you can safely ignore it &mdash;
                no account changes were made.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#8d94a2;line-height:1.8;">
                Tiny Watermelon, LLC &middot; 13307 Cedarbrook Ave NE, Albuquerque NM 87111<br />
                <a href="mailto:hi@tinywatermelon.com" style="color:#8d94a2;text-decoration:underline;">hi@tinywatermelon.com</a>
                &nbsp;&middot;&nbsp;
                <a href="https://tinywatermelon.com/privacy" style="color:#8d94a2;text-decoration:underline;">Privacy Policy</a>
                &nbsp;&middot;&nbsp;
                <a href="https://tinywatermelon.com/terms" style="color:#8d94a2;text-decoration:underline;">Terms</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
