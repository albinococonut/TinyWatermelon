"use server";

// Server actions for MFA enrollment.
// All actions verify the session before touching DB rows.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { verifyToken } from "@/lib/mfa";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export interface EnrollResult {
  ok: boolean;
  error?: string;
}

/**
 * Verify the 6-digit code against a freshly-issued pending secret and,
 * if valid, persist the encrypted secret + mfaEnrolledAt + mark the
 * current session as MFA-verified.
 *
 * The pending secret is passed in (hidden form field) because we don't
 * want to write it to DB until verification succeeds — that way a user
 * abandoning enrollment doesn't leave half-state behind.
 */
export async function completeEnrollment(formData: FormData): Promise<EnrollResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const pendingSecretEncrypted = String(formData.get("pendingSecretEncrypted") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!pendingSecretEncrypted) return { ok: false, error: "Enrollment expired. Reload the page." };

  if (!verifyToken(pendingSecretEncrypted, code)) {
    return { ok: false, error: "Code didn't match. Check your authenticator and try again." };
  }

  const now = new Date();
  const userId = session.user.id;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecretEnc: pendingSecretEncrypted,
        mfaEnrolledAt: now,
      },
    }),
    // Mark the current session as MFA-verified so they don't have to
    // enter another code immediately after enrolling.
    prisma.session.updateMany({
      where: { userId },
      data: { mfaVerifiedAt: now },
    }),
  ]);

  await audit({
    userId,
    action: "UPDATE",
    resourceType: "User.MFA",
    resourceId: userId,
    meta: { event: "mfa_enrolled" },
  });

  // Bust the auth cookie cache by redirecting fresh.
  redirect("/dashboard");
}
