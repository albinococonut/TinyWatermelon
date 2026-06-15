import Link from "next/link";
import { signOut, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // If the user does have an active membership, send them to the dashboard.
  const existing = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      acceptedAt: { not: null },
      revokedAt: null,
    },
    select: { id: true },
  });
  if (existing) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <img src="/watermelon-logo.png" alt="Watermelon" className="h-16 w-auto" />
      <div className="mt-10 rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
        <h1 className="font-display text-[24px] font-medium text-seed-900">
          You're not part of an organization yet
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-seed-600">
          Ask an admin at your organization to invite you, or
          contact us to set up a new account for your practice.
        </p>
        <a
          href="mailto:hello@watermelon.app"
          className="bg-melon-button mt-6 inline-flex rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white shadow-lift"
        >
          Contact us
        </a>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="mt-3"
        >
          <button type="submit" className="text-[12.5px] text-seed-500 hover:text-seed-700">
            Sign out
          </button>
        </form>
      </div>
      <Link href="/" className="mt-6 text-[12.5px] text-seed-400 hover:text-seed-600">
        ← Back to home
      </Link>
    </main>
  );
}
