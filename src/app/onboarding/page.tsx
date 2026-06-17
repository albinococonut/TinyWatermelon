import Link from "next/link";
import { signOut, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createOrg } from "./actions";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
      <Link href="/">
        <img src="/logo-long.png" alt="tiny watermelon" className="h-14 w-auto" />
      </Link>

      <div className="mt-10 w-full rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-melon-600">
          Getting started
        </p>
        <h1 className="font-display mt-2 text-[26px] font-medium text-seed-900">
          Create your organization
        </h1>
        <p className="mt-1 text-[14.5px] leading-relaxed text-seed-600">
          You'll be set up as the owner. After this step you'll review and sign
          the Business Associate Agreement.
        </p>

        <form action={createOrg} className="mt-7 space-y-4">
          <label className="block">
            <span className="text-[12.5px] font-semibold uppercase tracking-wider text-seed-500">
              Organization name
            </span>
            <input
              type="text"
              name="orgName"
              required
              autoComplete="organization"
              placeholder="Sunrise Pediatric Therapy"
              className="mt-1 w-full rounded-xl border border-seed-200 bg-seed-50 px-3.5 py-3 text-[15px] text-seed-900 placeholder:text-seed-400 focus:border-melon-400 focus:outline-none focus:ring-2 focus:ring-melon-200"
            />
          </label>

          <label className="block">
            <span className="text-[12.5px] font-semibold uppercase tracking-wider text-seed-500">
              Your name
            </span>
            <input
              type="text"
              name="yourName"
              autoComplete="name"
              placeholder="Alex Smith"
              className="mt-1 w-full rounded-xl border border-seed-200 bg-seed-50 px-3.5 py-3 text-[15px] text-seed-900 placeholder:text-seed-400 focus:border-melon-400 focus:outline-none focus:ring-2 focus:ring-melon-200"
            />
          </label>

          <button
            type="submit"
            className="bg-melon-button mt-2 w-full rounded-xl px-4 py-3 text-[15px] font-semibold text-white shadow-lift"
          >
            Create organization →
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[13px] text-seed-500">
        Being invited to an existing org?{" "}
        <a href="mailto:hi@tinywatermelon.com" className="font-medium text-melon-600 hover:text-melon-700">
          Contact us
        </a>
      </p>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
        className="mt-3"
      >
        <button type="submit" className="text-[12px] text-seed-400 hover:text-seed-600">
          Sign out
        </button>
      </form>
    </main>
  );
}
