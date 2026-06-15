// /join/:token — invite claim page.
// Works for both signed-in and signed-out users:
//   - Signed out → show sign-in prompt, then redirect back here after auth
//   - Signed in  → claim the invite and redirect to dashboard

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { claimInviteToken } from "@/lib/invite";
import { RoleLabel } from "@/lib/types";
import { authReady } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function JoinPage({ params }: { params: { token: string } }) {
  if (!authReady()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <img src="/watermelon-logo.png" alt="Watermelon" className="h-14 w-auto" />
        <div className="mt-8 w-full rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
          <h1 className="font-display text-[22px] font-medium text-seed-900">Production database coming soon</h1>
          <p className="mt-2 text-[14px] text-seed-600">Invite links will work once the database is connected.</p>
          <Link href="/" className="mt-6 inline-flex text-[14px] font-medium text-melon-600">← Back to home</Link>
        </div>
      </main>
    );
  }
  const session = await auth();

  // Load the invite so we can show details even before sign-in
  const invite = await prisma.inviteToken.findUnique({
    where: { token: params.token },
    select: {
      role: true,
      note: true,
      claimedAt: true,
      expiresAt: true,
      organization: { select: { name: true } },
    },
  });

  if (!invite) {
    return <ErrorPage message="This invite link is invalid or has already been used." />;
  }
  if (invite.claimedAt) {
    return <ErrorPage message="This invite has already been claimed. Ask an admin for a new link." />;
  }
  if (invite.expiresAt < new Date()) {
    return <ErrorPage message="This invite has expired (72-hour limit). Ask an admin for a new link." />;
  }

  const roleName = RoleLabel[invite.role as keyof typeof RoleLabel] ?? invite.role;

  // Parse note — may be plain text or JSON with { userNote, providerId, discipline }
  let displayNote: string | null = invite.note;
  try {
    if (invite.note?.startsWith("{")) {
      const parsed = JSON.parse(invite.note) as { userNote?: string | null; providerId?: string; discipline?: string };
      displayNote = parsed.userNote ?? null;
    }
  } catch { /* plain text note */ }

  // Not signed in → show the invite card and prompt to sign in
  if (!session?.user?.id) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
        <Link href="/" aria-label="Watermelon home">
          <img src="/watermelon-logo.png" alt="Watermelon" className="h-14 w-auto" />
        </Link>
        <div className="mt-8 w-full rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-melon-700">You're invited</div>
          <h1 className="font-display mt-1 text-[24px] font-medium text-seed-900">
            Join {invite.organization.name}
          </h1>
          <div className="mt-4 rounded-xl bg-seed-50 p-4 text-[14.5px] text-seed-700">
            <div className="flex items-center justify-between">
              <span>Your role</span>
              <span className="font-semibold text-seed-900">{roleName}</span>
            </div>
            {displayNote && (
              <div className="mt-2 border-t border-seed-200 pt-2 text-seed-600">{displayNote}</div>
            )}
          </div>
          <p className="mt-4 text-[13.5px] text-seed-600">
            Sign in with your work email to accept this invitation. This link expires in 72 hours.
          </p>
          <Link
            href={`/login?from=/join/${params.token}`}
            className="bg-melon-button mt-5 block w-full rounded-xl px-4 py-3 text-center text-[15px] font-semibold text-white shadow-lift"
          >
            Sign in to accept →
          </Link>
        </div>
      </main>
    );
  }

  // Signed in → claim automatically
  const result = await claimInviteToken(params.token, session.user.id);

  if (!result.ok) {
    return <ErrorPage message={result.error ?? "Could not claim this invite."} />;
  }

  // Redirect based on role — providers go to their profile, others to the marketplace
  if (result.role === "PROVIDER") {
    redirect("/me");
  } else {
    redirect("/marketplace");
  }
}

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <img src="/watermelon-logo.png" alt="Watermelon" className="h-14 w-auto" />
      <div className="mt-8 w-full rounded-3xl border border-melon-100 bg-white p-8 shadow-card">
        <div className="text-2xl">⚠️</div>
        <h1 className="font-display mt-3 text-[22px] font-medium text-seed-900">Invite unavailable</h1>
        <p className="mt-2 text-[14.5px] text-seed-600">{message}</p>
        <Link href="/" className="mt-6 inline-flex text-[14px] font-medium text-melon-600 hover:text-melon-700">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
