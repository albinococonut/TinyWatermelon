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
          className="text-[13px] font-medium text-seed-500 transition hover:text-seed-700"
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

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="mt-24 w-full text-left">
        <p className="text-[11.5px] font-semibold uppercase tracking-widest text-melon-600">
          How it works
        </p>
        <h2 className="font-display mt-2 text-[28px] font-medium leading-snug text-seed-900">
          Three steps to a recovered visit
        </h2>
        <div className="mt-8 space-y-6">
          <HowStep
            n="1"
            title="Cancellation enters the recovery queue"
            body="The moment a visit is canceled, Watermelon adds it to the Visit Recovery Queue and prioritizes it by revenue at risk and scheduling urgency."
          />
          <HowStep
            n="2"
            title="Choose the best replacement provider"
            body="Watermelon automatically ranks available providers based on authorization capacity, discipline match, and proximity to the family's location so coordinators can fill openings with a click."
          />
          <HowStep
            n="3"
            title="Families accept in one tap"
            body="A PHI-free text message sends the family a secure one-time magic link where they can view the available visit and accept or decline instantly."
          />
        </div>
      </section>

      {/* ── Who It's For ─────────────────────────────────────── */}
      <section className="mt-16 w-full rounded-2xl border border-seed-200 bg-white p-8 text-left shadow-card">
        <p className="text-[11.5px] font-semibold uppercase tracking-widest text-melon-600">
          Who it&rsquo;s for
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-seed-700">
          Watermelon is built for pediatric therapy organizations where every
          unfilled visit costs real money.
        </p>
        <ul className="mt-5 space-y-3">
          {[
            "ABA organizations serving children with autism",
            "Pediatric OT, PT, and SLP practices",
            "Multi-provider therapy groups managing insurance or Medicaid-funded visits",
            "Operations coordinators juggling cancellations through spreadsheets, group texts, and phone calls",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-[14.5px] text-seed-700">
              <span className="mt-px font-bold text-melon-500">·</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ── The Stakes ───────────────────────────────────────── */}
      <section className="mt-10 w-full rounded-2xl border border-melon-100 bg-melon-50 p-8 text-left">
        <p className="text-[11.5px] font-semibold uppercase tracking-widest text-melon-600">
          The stakes
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-seed-800">
          Every unfilled cancellation represents more than a missed appointment.
          It&rsquo;s a therapy visit a child needed and a billable hour that
          can never be recovered. For a 10-provider organization billing $80
          per hour, losing just one visit per provider each week can mean more
          than{" "}
          <strong className="text-seed-900">$40,000 in lost annual revenue</strong>.
          Watermelon helps recover those visits before they disappear.
        </p>
      </section>

      {/* ── HIPAA-First by Design ────────────────────────────── */}
      <section className="mt-16 w-full text-left">
        <p className="text-[11.5px] font-semibold uppercase tracking-widest text-melon-600">
          HIPAA-first by design
        </p>
        <h2 className="font-display mt-2 text-[28px] font-medium leading-snug text-seed-900">
          Compliance isn&rsquo;t a checkbox. It&rsquo;s the foundation.
        </h2>
        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            "BAA included at signup",
            "Immutable audit logging",
            "PHI-free family messaging",
            "Multi-factor authentication required",
            "Patient data never crosses between organizations",
            "Role-based access controls",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-melon-100 text-[11px] font-bold text-melon-600">
                ✓
              </span>
              <span className="text-[14.5px] text-seed-700">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="mt-16 w-full rounded-2xl border border-seed-200 bg-white p-10 text-center shadow-card">
        <h2 className="font-display text-[26px] font-medium text-seed-900">
          Ready to stop losing visits?
        </h2>
        <p className="mt-2 text-[15px] text-seed-600">
          Get started in minutes. No contract required.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="bg-melon-button inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[15px] font-semibold text-white shadow-lift transition"
          >
            Get started →
          </Link>
          <a
            href="mailto:hi@tinywatermelon.com"
            className="rounded-xl bg-seed-50 px-6 py-3 text-[15px] font-semibold text-seed-700 ring-1 ring-seed-200 transition hover:bg-seed-100"
          >
            Talk to us
          </a>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="mt-16 flex flex-wrap items-center justify-center gap-4 text-[12.5px] text-seed-400">
        <span>© {new Date().getFullYear()} Tiny Watermelon, LLC</span>
        <Link href="/privacy" className="hover:text-seed-600">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-seed-600">Terms of Service</Link>
        <a href="mailto:hi@tinywatermelon.com" className="hover:text-seed-600">hi@tinywatermelon.com</a>
      </div>
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

function HowStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-melon-50 text-[13px] font-bold text-melon-600">
        {n}
      </div>
      <div>
        <h3 className="font-display text-[18px] font-medium text-seed-900">{title}</h3>
        <p className="mt-1 text-[14.5px] leading-relaxed text-seed-600">{body}</p>
      </div>
    </div>
  );
}
