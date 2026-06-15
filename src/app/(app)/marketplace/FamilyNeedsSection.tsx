"use client";
import { useState, useTransition } from "react";
import { FamilyNeedsRow } from "./FamilyNeedsRow";
import { actionOfferTopSlots } from "./actions";

interface Need {
  childId: string;
  familyId: string;
  childName: string;
  hours: number;
  discipline: string;
  providerName?: string | null;
}

const DISC_COLORS: Record<string, string> = {
  OT: "bg-amber-50 text-amber-700 ring-amber-200",
  PT: "bg-violet-50 text-violet-700 ring-violet-200",
  SLP: "bg-sky-50 text-sky-700 ring-sky-200",
  MT: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ABA: "bg-orange-50 text-orange-700 ring-orange-200",
};

export function FamilyNeedsSection({
  needs,
  dEnd,
  totalHours,
}: {
  needs: Need[];
  dEnd: number;
  totalHours: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null);

  function toggle(childId: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(childId)) n.delete(childId); else n.add(childId);
      return n;
    });
  }

  function sendTopOffers() {
    start(async () => {
      const r = await actionOfferTopSlots(2);
      setResult({ sent: r.sent, total: r.total });
    });
  }

  const urgency = dEnd <= 7 ? "high" : dEnd <= 14 ? "med" : "low";

  return (
    <section>
      {/* ── Section header ───────────────────────────────────────────── */}
      <div className={`mb-4 rounded-2xl border px-5 py-4 ${
        urgency === "high"
          ? "border-melon-200 bg-melon-50"
          : urgency === "med"
          ? "border-amber-200 bg-amber-50"
          : "border-seed-200 bg-white"
      }`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className={`text-[11px] font-bold uppercase tracking-widest ${
              urgency === "high" ? "text-melon-700" : urgency === "med" ? "text-amber-700" : "text-seed-500"
            }`}>
              Families with visits owed this month
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="text-[22px] font-bold text-seed-900 leading-none">
                {needs.length}
              </span>
              <span className="text-[14px] text-seed-600">
                {needs.length === 1 ? "family" : "families"} ·{" "}
                <span className={`font-semibold ${urgency === "high" ? "text-melon-700" : "text-amber-700"}`}>
                  {totalHours.toFixed(1)}h
                </span>{" "}
                recoverable
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${
                urgency === "high"
                  ? "bg-melon-100 text-melon-800 ring-melon-200"
                  : urgency === "med"
                  ? "bg-amber-100 text-amber-800 ring-amber-200"
                  : "bg-seed-100 text-seed-700 ring-seed-200"
              }`}>
                {dEnd} day{dEnd !== 1 ? "s" : ""} left this month
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {result ? (
              <div className="flex items-center gap-2 rounded-xl bg-rind-50 px-4 py-2.5 text-[13px] font-semibold text-rind-700 ring-1 ring-rind-200">
                ✓ Offers sent for {result.sent}/{result.total} slots
              </div>
            ) : (
              <button
                onClick={sendTopOffers}
                disabled={pending}
                className="flex items-center gap-2 rounded-xl bg-melon-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-card hover:bg-melon-600 disabled:opacity-50 transition"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 11l18-8-7 18-3-8-8-2z" />
                </svg>
                {pending ? "Sending…" : "Send top 2 slots to all families"}
              </button>
            )}
            {selected.size > 0 && !result && (
              <button
                onClick={sendTopOffers}
                disabled={pending}
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50 transition"
              >
                {pending ? "Sending…" : `Offer top 2 to ${selected.size} selected`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Family grid ─────────────────────────────────────────────── */}
      {/* Single column on mobile, 2-col on lg, 3-col on xl+ */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {needs.map((m) => (
          <FamilyNeedsRow
            key={m.childId}
            need={{ childId: m.childId, childName: m.childName, hours: m.hours, discipline: m.discipline }}
            familyId={m.familyId}
            providerName={m.providerName}
            selected={selected.has(m.childId)}
            onToggle={() => toggle(m.childId)}
          />
        ))}
      </div>
    </section>
  );
}
