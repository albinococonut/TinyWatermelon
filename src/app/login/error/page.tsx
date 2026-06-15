import Link from "next/link";

export default function AuthErrorPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const code = searchParams?.error ?? "Default";
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-full rounded-3xl border border-melon-100 bg-white p-8 shadow-card">
        <h1 className="font-display text-[22px] font-medium text-seed-900">
          We couldn't sign you in
        </h1>
        <p className="mt-2 text-[14px] text-seed-600">
          {code === "Verification"
            ? "That magic link is expired or already used."
            : "Something went wrong on our end."}
        </p>
        <Link
          href="/login"
          className="bg-melon-button mt-6 inline-flex rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
