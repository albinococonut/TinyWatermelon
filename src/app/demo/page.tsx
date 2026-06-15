// /demo — one-click demo access.
// Signs in instantly as the demo coordinator via a Credentials provider.
// No email, no magic link, no friction.

import { signIn, signOut, auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DEMO_EMAIL = "owner@watermelon-therapy.example.com";

async function signInAsDemo() {
  "use server";
  await signOut({ redirect: false });
  await signIn("demo", { email: DEMO_EMAIL, redirectTo: "/dashboard" });
}

export default async function DemoPage() {
  // Only skip sign-in if already signed in as the coordinator demo user
  const session = await auth();
  if (session?.user?.email === DEMO_EMAIL) redirect("/dashboard");

  // Check the demo user exists in the DB
  const demoUser = await prisma.user
    .findUnique({
      where: { email: DEMO_EMAIL },
      select: { id: true },
    })
    .catch(() => null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
      <Link href="/" aria-label="tiny watermelon home">
        <img src="/logo-long.png" alt="tiny watermelon" className="h-14 w-auto" />
      </Link>

      <div className="mt-8 w-full rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-melon-700">
          Demo mode
        </div>
        <h1 className="font-display text-[24px] font-medium text-seed-900">
          Try Watermelon
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-seed-600">
          You&apos;ll sign in as the demo Watermelon Therapy coordinator with access to
          all 11 providers, 41 families, and a full week of live data.
        </p>

        {!demoUser ? (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">
            ⚠ Demo data isn&apos;t seeded yet. Run{" "}
            <code className="font-mono text-[12px]">npm run db:seed</code> in
            the project directory.
          </div>
        ) : (
          <form action={signInAsDemo} className="mt-5 space-y-3">
            <div className="rounded-xl bg-seed-50 px-4 py-3 text-[13.5px] text-seed-700">
              <div className="font-semibold text-seed-900">Demo account</div>
              <div className="mt-0.5 font-mono text-[12.5px]">{DEMO_EMAIL}</div>
            </div>
            <button
              type="submit"
              className="bg-melon-button w-full rounded-xl px-4 py-3 text-[15px] font-semibold text-white shadow-lift transition"
            >
              Enter demo →
            </button>
            <p className="text-center text-[12px] text-seed-500">
              No account or email required. All data is simulated.
            </p>
          </form>
        )}

        <div className="mt-5 rounded-xl bg-seed-50 px-3 py-2 text-[11.5px] text-seed-500">
          🔒 Demo data is simulated — no real PHI. Audit logged as demo access.
        </div>
      </div>

      <Link
        href="/"
        className="mt-6 text-[13px] font-medium text-seed-500 hover:text-seed-700"
      >
        ← Back to home
      </Link>
    </main>
  );
}
