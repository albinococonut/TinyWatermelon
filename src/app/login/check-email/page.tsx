import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <Link href="/" aria-label="Watermelon home">
        <img src="/watermelon-logo.png" alt="Watermelon · Therapy Scheduler" className="h-16 w-auto" />
      </Link>

      <div className="mt-10 w-full rounded-3xl border border-seed-200 bg-white p-8 shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rind-50 text-2xl">
          ✉️
        </div>
        <h1 className="font-display mt-5 text-[24px] font-medium text-seed-900">
          Check your email
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-seed-600">
          We've sent a sign-in link. Click it from any device to enter your
          Watermelon dashboard.
        </p>
        <p className="mt-4 rounded-lg bg-seed-100 px-3 py-2 text-[12px] text-seed-600">
          The link expires in 15 minutes. If it doesn't arrive, check your spam folder or request a new one.
        </p>
      </div>

      <Link href="/login" className="mt-6 text-[13px] font-medium text-seed-500 hover:text-seed-700">
        Use a different email →
      </Link>
    </main>
  );
}
