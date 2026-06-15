import Link from "next/link";
import { signOut, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildEnrollment } from "@/lib/mfa";
import { MfaEnrollForm } from "./MfaEnrollForm";

export const dynamic = "force-dynamic";

const MFA_REQUIRED_ROLES = new Set(["OWNER", "ADMIN"]);

export default async function MfaSetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Only OWNER and ADMIN need MFA. Coordinators, Providers, etc.
  // should never land here — redirect them immediately to the dashboard.
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, acceptedAt: { not: null }, revokedAt: null },
    select: { role: true },
  });
  if (!membership || !MFA_REQUIRED_ROLES.has(membership.role)) redirect("/dashboard");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, mfaEnrolledAt: true },
  });

  // Already enrolled — bounce to dashboard (re-enrollment isn't supported yet;
  // user must contact owner to reset).
  if (user?.mfaEnrolledAt) redirect("/dashboard");

  // Issue a fresh enrollment kit. The encrypted secret travels in a hidden
  // form field — it's only persisted to DB once the user proves they can
  // generate a valid code from it.
  const enrollment = await buildEnrollment(user?.email ?? session.user.email ?? "user");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
      <Link href="/" aria-label="Watermelon home" className="inline-flex flex-col items-center gap-1">
        <img src="/logo-long.png" alt="tiny watermelon" className="h-12 w-auto" />
        
      </Link>

      <div className="mt-8 w-full rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-melon-50 text-2xl">
          🔐
        </div>
        <h1 className="font-display mt-4 text-center text-[24px] font-medium text-seed-900">
          Set up two-factor auth
        </h1>
        <p className="mt-2 text-center text-[14px] leading-relaxed text-seed-600">
          Required for Admin and Owner accounts. Scan the code with any
          authenticator app — Google Authenticator, 1Password, Authy, etc.
        </p>

        {/* QR + manual secret fallback */}
        <div className="mt-6 flex flex-col items-center rounded-2xl bg-seed-50 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrDataUrl}
            alt="QR code for authenticator app"
            className="h-44 w-44 rounded-lg bg-white p-2 shadow-card"
          />
          <details className="mt-3 w-full text-center">
            <summary className="cursor-pointer text-[12.5px] font-medium text-seed-500 hover:text-seed-700">
              Can&apos;t scan? Enter the secret manually
            </summary>
            <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-center font-mono text-[12px] tracking-wider text-seed-700 shadow-card">
              {enrollment.secret}
            </code>
          </details>
        </div>

        <div className="mt-6">
          <MfaEnrollForm pendingSecretEncrypted={enrollment.secretEncrypted} />
        </div>

        <p className="mt-4 rounded-lg bg-seed-100 px-3 py-2 text-center text-[11.5px] text-seed-600">
          🔒 Your secret is generated server-side and stored encrypted at rest
          (AES-256-GCM). Lose access to your authenticator? Contact your
          organization Owner to reset.
        </p>
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
