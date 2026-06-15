// Role-based access guards. These are the gate functions every protected
// route should call early. They:
//   1. Confirm a session exists
//   2. Confirm the user has a membership in some organization
//   3. (optionally) Confirm the role is permitted for the action
//
// If a guard fails, it redirects to /login (or /onboarding / /mfa-setup).
// Server-only — never import these into client components.

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./db";
import type { Role } from "./types";
import { MFA_REQUIRED_ROLES, isRole } from "./types";

export interface RequiredSession {
  userId: string;
  email: string;
  organizationId: string;
  role: Role;
  providerId: string | null;
  organizationName: string;
}

/**
 * Require a signed-in user with an active org membership.
 * Redirects to /login if not authenticated, /onboarding if no org,
 * /mfa-setup if role requires MFA and user hasn't enrolled.
 */
export async function requireSession(opts?: {
  allowedRoles?: readonly Role[];
}): Promise<RequiredSession> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // Load membership + user MFA state + org name in parallel
  const [membership, user] = await Promise.all([
    prisma.membership.findFirst({
      where: {
        userId,
        acceptedAt: { not: null },
        revokedAt: null,
      },
      select: {
        organizationId: true,
        role: true,
        providerId: true,
        organization: { select: { name: true } },
      },
      orderBy: { invitedAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnrolledAt: true, email: true },
    }),
  ]);

  if (!membership || !isRole(membership.role)) redirect("/onboarding");
  const role: Role = membership.role;

  if (opts?.allowedRoles && !opts.allowedRoles.includes(role)) {
    redirect("/marketplace?denied=1");
  }

  // Demo account bypasses MFA — checked against DB email, not session JWT.
  const isDemo = user?.email === "owner@watermelon-therapy.example.com";

  if (!isDemo && MFA_REQUIRED_ROLES.has(role)) {
    if (!user?.mfaEnrolledAt) redirect("/mfa-setup");

    // Per-session check — has THIS session been MFA-verified yet?
    const sessionToken =
      (await cookies()).get("authjs.session-token")?.value ??
      (await cookies()).get("__Secure-authjs.session-token")?.value;
    if (sessionToken) {
      const s = await prisma.session.findUnique({
        where: { sessionToken },
        select: { mfaVerifiedAt: true },
      });
      if (!s?.mfaVerifiedAt) redirect("/mfa-verify");
    }
  }

  return {
    userId,
    email: session.user.email ?? "",
    organizationId: membership.organizationId,
    role,
    providerId: membership.providerId ?? null,
    organizationName: membership.organization?.name ?? "",
  };
}

/** Convenience predicate for UI gating (does not redirect). */
export function hasRole(actual: Role | null | undefined, ...allowed: Role[]): boolean {
  return !!actual && allowed.includes(actual);
}

/**
 * Returns a Prisma `where` clause extension that limits queries to only
 * the records the current user is allowed to see.
 *
 * ADMIN/OWNER → no extra filter (see everything in org).
 * PROVIDER                → filter by their own providerId only.
 */
export function providerScope(ctx: RequiredSession): { providerId?: string } {
  if (ctx.role === "PROVIDER" && ctx.providerId) {
    return { providerId: ctx.providerId };
  }
  return {};
}
