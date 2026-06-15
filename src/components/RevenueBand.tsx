import Link from "next/link";
import type { RevenueSnapshot } from "@/lib/revenue";

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function fmtHrs(h: number) {
  return `${h.toFixed(1)}h`;
}

export function RevenueBand({
  rev,
  daysToMonthEnd,
}: {
  rev: RevenueSnapshot;
  daysToMonthEnd: number;
}) {
  const smartNote = rev.gapType === "balanced" ? null
    : rev.gapType === "provider_shortage"
      ? `${fmtHrs(rev.gapHours)} not recoverable — not enough provider openings this month`
      : `${fmtHrs(rev.gapHours)} of provider time unfillable — families have used their authorized hours`;

  return (
    <section
      aria-label="Service & revenue recovery"
      className="bg-revenue-band relative overflow-hidden rounded-3xl border border-melon-100 p-5 shadow-card md:p-6"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold uppercase tracking-wider text-melon-700 shadow-sm ring-1 ring-melon-100">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-melon-500" />
            Service & revenue recovery · month-end in {daysToMonthEnd}d
          </div>
          <h2 className="mt-2 font-display text-[26px] font-medium leading-tight tracking-tight text-seed-900 md:text-[30px]">
            {fmtHrs(rev.recoverableHours)} recoverable this month
          </h2>
          <p className="mt-0.5 text-[13px] text-seed-600 md:text-[14px]">
            {fmtHrs(rev.familyHoursNotScheduledThisMonth)} not yet scheduled · {fmtHrs(rev.providerOpeningsThisMonth)} provider openings available
          </p>
        </div>
        <Link href="/settings" className="self-start rounded-lg bg-white/70 px-2.5 py-1 text-[12px] font-medium text-seed-600 transition hover:bg-white hover:text-seed-800">
          Adjust rates →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Family hours owed */}
        <RevCell
          label="Family hours not scheduled this month"
          value={fmtHrs(rev.familyHoursNotScheduledThisMonth)}
          sub={`authorized − delivered & scheduled`}
          tone="amber"
        />
        {/* Provider openings */}
        <RevCell
          label="Provider openings this month"
          value={fmtHrs(rev.providerOpeningsThisMonth)}
          sub={`${rev.openSlotsCount} open slots + cancelled time`}
          tone="rind"
        />
        {/* Recoverable = min of above two */}
        <RevCellLink
          href="/marketplace"
          label="Recoverable service hours"
          value={fmtHrs(rev.recoverableHours)}
          sub={`≈ ${fmtCurrency(rev.recoverableValue)} · go to queue`}
          tone="melon"
        />
        {/* Lost last month */}
        <RevCell
          label="Service hours lost last month"
          value={fmtHrs(rev.lostHours)}
          sub={`≈ ${fmtCurrency(rev.lostValue)} · capacity reset`}
          tone="seed"
        />
      </div>

      {/* Smart insight */}
      {smartNote && (
        <div className="mt-3 rounded-xl bg-white/60 px-3 py-2 text-[12px] font-medium text-seed-600 ring-1 ring-seed-200">
          ⚠ {smartNote}
        </div>
      )}

      {/* Recovered last 30 days */}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-white/60 px-3 py-2 text-[12px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-rind-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rind-500" />
          Recovered in the last 30 days
        </span>
        <span className="text-seed-600">
          <span className="font-semibold text-rind-700">{rev.recoveredLast30DaysCount} visits</span>
          {" · "}
          {fmtCurrency(rev.recoveredLast30DaysValue)}
          {" · "}
          all-time: <span className="font-semibold text-seed-800">{fmtCurrency(rev.recoveredAllTimeValue)}</span>
        </span>
      </div>
    </section>
  );
}

function RevCell({ label, value, sub, tone }: {
  label: string; value: string; sub: string;
  tone: "melon" | "rind" | "amber" | "seed";
}) {
  const accent = { melon: "text-melon-700", rind: "text-rind-700", amber: "text-amber-700", seed: "text-seed-700" }[tone];
  const dot = { melon: "bg-melon-500", rind: "bg-rind-500", amber: "bg-amber-500", seed: "bg-seed-400" }[tone];
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-white/60">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-seed-500">{label}</span>
      </div>
      <div className={`mt-1.5 text-[26px] font-semibold tabular-nums leading-none ${accent}`}>{value}</div>
      <div className="mt-1.5 text-[12px] text-seed-500">{sub}</div>
    </div>
  );
}

function RevCellLink({ href, label, value, sub, tone }: {
  href: string; label: string; value: string; sub: string;
  tone: "melon" | "rind" | "amber" | "seed";
}) {
  const accent = { melon: "text-melon-700", rind: "text-rind-700", amber: "text-amber-700", seed: "text-seed-700" }[tone];
  const dot = { melon: "bg-melon-500", rind: "bg-rind-500", amber: "bg-amber-500", seed: "bg-seed-400" }[tone];
  return (
    <Link href={href} className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-white/60 transition hover:shadow-md hover:ring-melon-200">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-seed-500">{label}</span>
        <span className="ml-auto text-[10px] font-semibold text-melon-500">→</span>
      </div>
      <div className={`mt-1.5 text-[26px] font-semibold tabular-nums leading-none ${accent}`}>{value}</div>
      <div className="mt-1.5 text-[12px] text-seed-500">{sub}</div>
    </Link>
  );
}
