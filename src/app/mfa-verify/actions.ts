"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { verifyToken } from "@/lib/mfa";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface VerifyResult {
  ok: boolean;
  error?: string;
}

export async function verifyMfaCode(formData: FormData): Promise<VerifyResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const userId = session.user.id;
  const code = String(formData.get("code") ?? "");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecretEnc: true },
  });
  if (!user?.mfaSecretEnc) return { ok: false, error: "MFA not enrolled." };

  if (!verifyToken(user.mfaSecretEnc, code)) {
    // Audit the failed attempt — important signal for account-takeover detection.
    await audit({
      userId,
      action: "LOGIN",
      resourceType: "User.MFA",
      resourceId: userId,
      meta: { event: "mfa_verify_failed" },
    });
    return { ok: false, error: "Code didn't match. Try again with the latest code from your authenticator." };
  }

  // Find this user's most-recent session (the one this request is using)
  // and stamp it verified.
  const sessionToken = cookies().get("authjs.session-token")?.value ??
                       cookies().get("__Secure-authjs.session-token")?.value;
  if (sessionToken) {
    await prisma.session.update({
      where: { sessionToken },
      data: { mfaVerifiedAt: new Date() },
    });
  } else {
    // Fallback: stamp all this user's active sessions
    await prisma.session.updateMany({
      where: { userId },
      data: { mfaVerifiedAt: new Date() },
    });
  }

  await audit({
    userId,
    action: "LOGIN",
    resourceType: "User.MFA",
    resourceId: userId,
    meta: { event: "mfa_verify_success" },
  });

  const from = String(formData.get("from") ?? "/dashboard");
  redirect(from);
}
