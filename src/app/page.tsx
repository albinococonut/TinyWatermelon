import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <img
        src="/logo-long.png"
        alt="tiny watermelon · Therapy Scheduler"
        className="h-24 w-auto"
      />

      <h1 className="font-display mt-10 text-[44px] font-medium leading-[1.05] tracking-tight text-seed-900 md:text-[56px]">
        Recover missed visits.
        <br />
        Keep families served.
      </h1>

      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-seed-600">
        The HIPAA-compliant visit recovery platform for pediatric provider
        organizations. Built around your monthly service capacity and your
        families' time.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="bg-melon-button inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[16px] font-semibold text-white shadow-lift transition"
        >
          Sign in
        </Link>
        <Link
          href="/demo"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-white px-5 py-3 text-[16px] font-semibold text-seed-700 ring-1 ring-seed-200 transition hover:bg-seed-100"
        >
          Try the demo →
        </Link>
      </div>
      <div className="mt-3 flex justify-center">
        <Link
          href="/demo/provider"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-medium text-seed-500 hover:text-seed-700 transition"
        >
          Provider demo →
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
        <FeatureBlock
          title="HIPAA-compliant"
          body="BAAs with every vendor. Audit logged. Multi-tenant with strict row-level scoping."
        />
        <FeatureBlock
          title="PHI-free messaging"
          body="Family offers go out as generic notifications; all visit details revealed only behind authenticated magic links."
        />
        <FeatureBlock
          title="Built for coordinators"
          body="One operations surface — Recovery Queue, Smart Family Offers, Provider Day View, audit-grade reporting."
        />
      </div>

      <p className="mt-16 text-[12.5px] text-seed-400">
        © {new Date().getFullYear()} Watermelon. For provider organizations only.
      </p>
    </main>
  );
}

function FeatureBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-seed-200 bg-white p-5 shadow-card">
      <h3 className="font-display text-[19px] font-medium text-seed-900">
        {title}
      </h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-seed-600">{body}</p>
    </div>
  );
}
