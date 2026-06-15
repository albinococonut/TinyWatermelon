"use client";

import { useState, useTransition } from "react";
import { getFamilySlots, actionSendOffer } from "./actions";

interface FamilyNeed {
  childId: string;
  childName: string;
  hours: number;
  discipline: string;
}

const DISC_COLORS: Record<string, string> = {
  OT: "bg-amber-50 text-amber-800", PT: "bg-violet-50 text-violet-800",
  SLP: "bg-sky-50 text-sky-800", MT: "bg-emerald-50 text-emerald-800", ABA: "bg-orange-50 text-orange-800",
};

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Slot panel lives in its own component so hooks are always called unconditionally */
function SlotPanel({
  slots,
  need,
}: {
  slots: Awaited<ReturnType<typeof getFamilySlots>>["slots"];
  need: FamilyNeed;
}) {
  const [checkedSlots, setCheckedSlots] = useState<Set<string>>(new Set());
  const [offerSent, setOfferSent] = useState(false);
  const [offerPending, startOffer] = useTransition();

  function toggle(id: string) {
    setCheckedSlots(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="border-t border-seed-100 bg-seed-50/50 px-4 py-3">
        <p className="text-[13px] text-seed-500">No open slots available for this family&apos;s disciplines.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-seed-100 bg-seed-50/50 px-4 py-3 space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-seed-400">
        Select slots to offer · {slots.length} available
      </div>
      {slots.map((slot: any) => {
        const leg = slot.leg as { minutes: number; band: string; minutesToNextAppt: number | null } | null;
        const spare = leg?.minutesToNextAppt;
        const feasible = spare === null || spare === undefined || spare >= 0;
        return (
          <label
            key={slot.id}
            className={`flex items-start gap-3 rounded-lg bg-white px-3 py-2.5 ring-1 cursor-pointer transition ${
              !feasible ? "opacity-60" :
              checkedSlots.has(slot.id) ? "ring-melon-400 bg-melon-50/40" : "ring-seed-200 hover:ring-seed-300"
            }`}
          >
            <input
              type="checkbox"
              checked={checkedSlots.has(slot.id)}
              onChange={() => toggle(slot.id)}
              className="h-4 w-4 rounded border-seed-300 text-melon-600 shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-seed-900">
                {fmtDate(new Date(slot.startsAt))} · {fmtTime(new Date(slot.startsAt))}
              </div>
              <div className="text-[12px] text-seed-500 mt-0.5">
                {slot.discipline} · {slot.provider?.name}
                {slot.provider?.discipline !== need.discipline && (
                  <span className="ml-1 text-amber-600 font-medium">(different discipline)</span>
                )}
              </div>
              {/* Commute feasibility badge */}
              {leg && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                    leg.band === "heavy" ? "bg-melon-50 text-melon-700" :
                    leg.minutes > 20 ? "bg-amber-50 text-amber-700" : "bg-rind-50 text-rind-700"
                  }`}>
                    🚗 {leg.minutes} min drive{leg.band === "heavy" ? " · heavy traffic" : ""}
                  </span>
                  {spare !== null && spare !== undefined && (
                    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                      spare < 0 ? "bg-melon-100 text-melon-800" :
                      spare < 10 ? "bg-amber-100 text-amber-800" : "bg-sky-50 text-sky-700"
                    }`}>
                      {spare < 0
                        ? `⚠ ${Math.abs(spare)} min short — schedule conflict`
                        : spare < 10
                        ? `⚠ Only ${spare} min to spare`
                        : `✓ ${spare} min to spare`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </label>
        );
      })}

      {checkedSlots.size > 0 && !offerSent && (
        <button
          disabled={offerPending}
          onClick={() =>
            startOffer(async () => {
              for (const slotId of checkedSlots) {
                await actionSendOffer(slotId);
              }
              setOfferSent(true);
            })
          }
          className="w-full rounded-xl bg-melon-500 py-2.5 text-[13px] font-semibold text-white hover:bg-melon-600 disabled:opacity-50 transition mt-1"
        >
          {offerPending
            ? "Sending…"
            : `Send offer for ${checkedSlots.size} selected slot${checkedSlots.size > 1 ? "s" : ""} to this family`}
        </button>
      )}

      {offerSent && (
        <div className="rounded-xl bg-rind-50 py-2.5 text-center text-[13px] font-semibold text-rind-700">
          ✓ Offer sent — first to confirm books the slot
        </div>
      )}
    </div>
  );
}

export function FamilyNeedsRow({
  need,
  familyId,
  providerName,
  selected,
  onToggle,
}: {
  need: FamilyNeed;
  familyId: string;
  providerName?: string | null;
  selected?: boolean;
  onToggle?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof getFamilySlots>> | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    if (data) {
      setExpanded((e) => !e);
      return;
    }
    startTransition(async () => {
      const result = await getFamilySlots(familyId);
      setData(result);
      setExpanded(true);
    });
  }

  return (
    <div className="rounded-xl border border-seed-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        {onToggle && (
          <input type="checkbox" checked={selected} onChange={onToggle}
            className="h-4 w-4 rounded border-seed-300 text-melon-600 shrink-0" />
        )}
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-seed-900 text-[14px]">{need.childName}</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DISC_COLORS[need.discipline] ?? "bg-seed-100 text-seed-700"}`}>
              {need.discipline}
            </span>
            <span className="text-[12px] text-amber-700 font-medium">{need.hours.toFixed(1)}h owed</span>
          </div>
          {providerName && <div className="text-[12px] text-seed-500 mt-0.5">Established: {providerName}</div>}
        </div>
        {/* Action */}
        <button
          onClick={load}
          disabled={pending}
          className="shrink-0 rounded-lg bg-melon-50 border border-melon-200 px-2.5 py-1.5 text-[12px] font-semibold text-melon-700 hover:bg-melon-100 transition disabled:opacity-50"
        >
          {pending ? "…" : expanded ? "Hide" : "Offer →"}
        </button>
      </div>

      {/* Expanded slots panel */}
      {expanded && data && <SlotPanel slots={data.slots} need={need} />}
    </div>
  );
}
