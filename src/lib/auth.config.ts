// Edge-safe NextAuth config — no Node-only deps (Prisma, Nodemailer).
// This config is what the Edge middleware uses to validate session cookies.
// The full config in auth.ts extends this with the Prisma adapter + Nodemailer.

import type { NextAuthConfig } from "next-auth";

export default {
  trustHost: true,
  // Providers list is filled in by auth.ts (which can use Node APIs).
  // Middleware only needs to know about cookies/JWT, not provider details.
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login/error",
  },
  callbacks: {
    // Embed user.id into the JWT so the edge middleware can read it
    // without hitting the database.
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      return token;
    },
    // Expose user.id from the JWT to the session object.
    // requireSession() in rbac.ts does the full membership lookup server-side.
    async session({ session, token }) {
      if (token?.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
