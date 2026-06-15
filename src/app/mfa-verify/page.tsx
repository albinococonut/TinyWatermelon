import Link from "next/link";
import { signOut, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MfaVerifyForm } from "./MfaVerifyForm";

export const dynamic = "force-dynamic";

const MFA_REQUIRED_ROLES = new Set(["OWNER", "ADMIN"]);

export default async function MfaVerifyPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Only OWNER and ADMIN need MFA verification. Anyone else gets bounced
  // straight to the dashboard — they should never be here.
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, acceptedAt: { not: null }, revokedAt: null },
    select: { role: true },
  });
  if (!membership || !MFA_REQUIRED_ROLES.has(membership.role)) redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnrolledAt: true },
  });

  // Not enrolled — send to setup.
  if (!user?.mfaEnrolledAt) redirect("/mfa-setup");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
      <Link href="/" aria-label="tiny watermelon home" className="inline-flex flex-col items-center gap-1">
        <img src="/logo-long.png" alt="tiny watermelon" className="h-12 w-auto" />
        
      </Link>

      <div className="mt-8 w-full rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rind-50 text-2xl">
          🔐
        </div>
        <h1 className="font-display mt-4 text-center text-[24px] font-medium text-seed-900">
          Two-factor verification
        </h1>
        <p className="mt-2 text-center text-[14px] leading-relaxed text-seed-600">
          Enter the current 6-digit code from your authenticator app to continue.
        </p>

        <div className="mt-6">
          <MfaVerifyForm from={searchParams?.from} />
        </div>
      </div>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
        className="mt-6"
      >
        <button type="submit" className="text-[12.5px] text-seed-500 hover:text-seed-700">
          Sign out
        </button>
      </form>
    </main>
  );
}
