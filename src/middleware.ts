// Edge middleware — runs before every request to a protected route.
// Uses the EDGE-SAFE auth config (no Node deps) to verify the session cookie.
// Membership/role lookups happen later in requireSession() (Node runtime).

import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const { pathname } = req.nextUrl;

  const isProtected =
    pathname.startsWith("/app") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/me") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/api/v1");

  if (isProtected && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
});

export const config = {
  matcher: [
    // Exclude: auth routes, static assets, and public token pages (/o/ family portal, /join/ invites)
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|opengraph-image\\.png|watermelon-logo\\.png|logo-long\\.svg|logo-stacked\\.svg|logo-favicon\\.png|o/|join/|demo).*)",
  ],
};
