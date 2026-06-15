// /demo/provider — one-click provider demo.
// Signs in as Jordan Blake (Music Therapist) and goes straight to /me.

import { signIn, signOut, auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PROVIDER_DEMO_EMAIL = "jordan@watermelon-therapy.example.com";

async function signInAsProviderDemo() {
  "use server";
  // Sign out any existing session first, then sign in as Jordan
  await signOut({ redirect: false });
  await signIn("demo", { email: PROVIDER_DEMO_EMAIL, redirectTo: "/me" });
}

export default async function ProviderDemoPage() {
  const session = await auth();
  // Only skip sign-in if already signed in as Jordan specifically
  if (session?.user?.email === PROVIDER_DEMO_EMAIL) redirect("/me");

  const demoUser = await prisma.user
    .findUnique({ where: { email: PROVIDER_DEMO_EMAIL }, select: { id: true } })
    .catch(() => null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
      <Link href="/" aria-label="tiny watermelon home">
        <img src="/logo-long.png" alt="tiny watermelon" className="h-14 w-auto" />
      </Link>

      <div className="mt-8 w-full rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
        <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-rind-700">
          Provider demo
        </div>
        <h1 className="font-display text-[24px] font-medium text-seed-900">
          Provider Day View
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-seed-600">
          See the schedule from a therapist&apos;s perspective. You&apos;ll sign in as Jordan Blake, MT-BC — Music Therapist.
        </p>

        {!demoUser ? (
          <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-[13.5px] text-amber-800">
            ⚠ Demo data isn&apos;t seeded yet.
          </div>
        ) : (
          <form action={signInAsProviderDemo} className="mt-5 space-y-3">
            <div className="rounded-xl bg-seed-50 px-4 py-3 text-[13.5px] text-seed-700">
              <div className="font-semibold text-seed-900">Jordan Blake</div>
              <div className="mt-0.5 text-[13px] text-seed-500">MT-BC · Music Therapist</div>
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-rind-600 px-4 py-3 text-[15px] font-semibold text-white shadow-lift transition hover:bg-rind-700"
            >
              View my schedule →
            </button>
            <p className="text-center text-[12px] text-seed-500">
              No account required. Simulated data only.
            </p>
          </form>
        )}

        <div className="mt-5 rounded-xl bg-seed-50 px-3 py-2 text-[11.5px] text-seed-500">
          🔒 Demo data is simulated — no real PHI.
        </div>
      </div>

      <div className="mt-4 flex gap-4 text-[13px] font-medium text-seed-500">
        <Link href="/demo" className="hover:text-seed-700">← Coordinator demo</Link>
        <Link href="/" className="hover:text-seed-700">Home →</Link>
      </div>
    </main>
  );
}
