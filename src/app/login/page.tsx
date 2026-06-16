import Link from "next/link";
import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { authReady } from "@/lib/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { from?: string; error?: string };
}) {
  // Production preview build (Vercel) without a real DB → show notice.
  if (!authReady()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <Link href="/" aria-label="tiny watermelon home">
          <img src="/logo-long.png" alt="tiny watermelon" className="h-14 w-auto" />
        </Link>
        <div className="mt-10 w-full rounded-3xl border border-melon-100 bg-white p-8 shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-melon-50 text-2xl">
            🚧
          </div>
          <h1 className="font-display mt-5 text-[24px] font-medium text-seed-900">
            Production sign-in coming soon
          </h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-seed-600">
            The HIPAA-compliant database connection (Neon Postgres + BAA) is being provisioned. Until then, sign-in is local-development-only.
          </p>
          <Link
            href="/"
            className="bg-melon-button mt-6 inline-flex rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white shadow-lift"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  // If already signed in, send them to the dashboard.
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  const errorCode = searchParams?.error;
  const from = searchParams?.from;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16">
      <Link href="/" aria-label="tiny watermelon home">
        <img src="/logo-long.png" alt="tiny watermelon · Therapy Scheduler" className="h-14 w-auto" />
      </Link>

      <div className="mt-10 w-full rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
        <h1 className="font-display text-[26px] font-medium text-seed-900">Sign in</h1>
        <p className="mt-1 text-[14.5px] text-seed-600">
          We'll email you a magic link. No password required.
        </p>

        <form
          action={async (formData) => {
            "use server";
            const email = String(formData.get("email") ?? "").trim().toLowerCase();
            if (!email) return;
            await signIn("nodemailer", {
              email,
              redirectTo: from || "/dashboard",
            });
          }}
          className="mt-6 space-y-3"
        >
          <label className="block">
            <span className="text-[12.5px] font-semibold uppercase tracking-wider text-seed-500">
              Work email
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@watermelon-therapy.org"
              className="mt-1 w-full rounded-xl border border-seed-200 bg-seed-50 px-3.5 py-3 text-[15px] text-seed-900 placeholder:text-seed-400 focus:border-melon-400 focus:outline-none focus:ring-2 focus:ring-melon-200"
            />
          </label>
          <button
            type="submit"
            className="bg-melon-button w-full rounded-xl px-4 py-3 text-[15px] font-semibold text-white shadow-lift"
          >
            Send magic link
          </button>
          {errorCode && (
            <p className="rounded-lg bg-melon-50 px-3 py-2 text-center text-[12.5px] text-melon-700">
              {decodeError(errorCode)}
            </p>
          )}
        </form>
      </div>

      <Link href="/" className="mt-8 text-[13px] font-medium text-seed-500 hover:text-seed-700">
        ← Back to home
      </Link>
      <div className="mt-4 flex gap-4 text-[11.5px] text-seed-400">
        <Link href="/privacy" className="hover:text-seed-600">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-seed-600">Terms of Service</Link>
      </div>
    </main>
  );
}

function decodeError(code: string): string {
  switch (code) {
    case "Verification":
      return "That magic link is expired or already used. Please request a new one.";
    case "Configuration":
      return "Email isn't configured on this environment.";
    default:
      return "Sign-in failed. Please try again.";
  }
}
