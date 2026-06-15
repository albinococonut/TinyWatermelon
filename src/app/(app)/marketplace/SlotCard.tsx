"use client";

import { useState, useTransition } from "react";
import { getSlotCandidates } from "./actions";
import { OfferButton, ConfirmButton } from "./DispatchButtons";

function ordinal(n: number): string {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

function buildSmsPreview(slot: Slot): string {
  const d = new Date(slot.startsAt);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const firstName = slot.providerName.split(" ")[0];
  return `A make-up appointment is available with ${firstName} on ${weekday} ${month} ${ordinal(d.getDate())} at ${time}.\nTap to claim: wmln.app/o/ab12cd34\n\nSent by TinyWatermelon.com`;
}

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  discipline: string;
  providerName: string;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function durMin(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

const DISC_COLOR: Record<string, string> = {
  OT: "bg-amber-50 text-amber-800 ring-amber-200",
  PT: "bg-violet-50 text-violet-800 ring-violet-200",
  SLP: "bg-sky-50 text-sky-800 ring-sky-200",
  MT: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  ABA: "bg-orange-50 text-orange-800 ring-orange-200",
};

/** One-tap offer button shown directly on the card header — no expand needed */
function QuickOfferButton({ slotId, onFilled }: { slotId: string; onFilled?: () => void }) {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [pending, start] = useTransition();

  if (state === "sent") {
    return (
      <div className="rounded-xl bg-rind-50 px-3 py-2 text-center text-[12px] font-semibold text-rind-700 ring-1 ring-rind-200">
        ✓ Offer sent
      </div>
    );
  }
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const { actionSendOffer } = await import("./actions");
          const r = await actionSendOffer(slotId);
          if (r.ok) { setState("sent"); onFilled?.(); }
          else setState("error");
        })
      }
      className="flex items-center justify-center gap-1.5 rounded-xl bg-melon-500 px-3 py-2 text-[13px] font-semibold text-white shadow-card hover:bg-melon-600 disabled:opacity-50 transition"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-8-7 18-3-8-8-2z" />
      </svg>
      {pending ? "Sending…" : "Send Smart Offer"}
    </button>
  );
}

export function SlotCard({
  slot,
  isLive,
  onFilled,
}: {
  slot: Slot;
  isLive: boolean;
  onFilled?: (slotId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof getSlotCandidates>> | null>(null);
  const [pending, startTransition] = useTransition();

  const start_ = new Date(slot.startsAt);
  const end_ = new Date(slot.endsAt);

  function load() {
    if (data) {
      setExpanded((e) => !e);
      return;
    }
    startTransition(async () => {
      const result = await getSlotCandidates(slot.id);
      setData(result);
      setExpanded(true);
    });
  }

  return (
    <div className="rounded-2xl border border-seed-200 bg-white shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[15px] font-semibold text-seed-900">{slot.providerName}</span>
            <span
              className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ring-1 ${
                DISC_COLOR[slot.discipline] ?? "bg-seed-100 text-seed-700 ring-seed-200"
              }`}
            >
              {slot.discipline}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-melon-50 px-1.5 py-0.5 text-[11px] font-semibold text-melon-700 ring-1 ring-melon-200">
                <span className="h-1.5 w-1.5 rounded-full bg-melon-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="text-[13px] text-seed-600">
            {fmtDate(start_)} · {fmtTime(start_)}–{fmtTime(end_)} · {durMin(start_, end_)} min
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <QuickOfferButton slotId={slot.id} onFilled={onFilled ? () => onFilled(slot.id) : undefined} />
          <button
            onClick={load}
            disabled={pending}
            className="rounded-xl bg-seed-100 px-3 py-2 text-[13px] font-semibold text-seed-700 hover:bg-seed-200 transition disabled:opacity-50"
          >
            {pending ? "Loading…" : expanded ? "Hide" : "Find families →"}
          </button>
        </div>
      </div>

      {/* Expanded candidates */}
      {expanded && data && (
        <div className="border-t border-seed-100 bg-seed-50/50 p-5">
          {/* SMS preview — shown when panel is open */}
          <div className="mb-5 rounded-2xl border border-rind-200 bg-rind-50 overflow-hidden">
            <div className="px-4 py-2 text-center border-b border-rind-200 bg-white">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-seed-400">Text families will receive</div>
            </div>
            <div className="p-4 bg-seed-50">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-rind-500 px-3.5 py-2.5 text-[13px] leading-snug text-white whitespace-pre-line">
                {buildSmsPreview(slot)}
              </div>
              <div className="mt-1 text-right text-[10px] text-seed-500">Delivered to each eligible family</div>
            </div>
          </div>

          {/* Provider commute feasibility — next appointment timing */}
          {data.leg && data.leg.minutesToNextAppt !== undefined && data.leg.minutesToNextAppt !== null && (
            <div className={`mb-4 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold ${
              data.leg.minutesToNextAppt < 0
                ? "bg-melon-50 text-melon-700 ring-1 ring-melon-200"
                : data.leg.minutesToNextAppt < 10
                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                : "bg-rind-50 text-rind-700 ring-1 ring-rind-200"
            }`}>
              {data.leg.minutesToNextAppt < 0
                ? `⚠ Next appt conflict (${Math.abs(data.leg.minutesToNextAppt)} min short after this slot)`
                : data.leg.minutesToNextAppt < 10
                ? `⚠ ${data.leg.minutesToNextAppt} min to spare before next appointment`
                : `✓ ${data.leg.minutesToNextAppt} min before next appointment`}
            </div>
          )}

          {/* Offer button */}
          <div className="mb-4">
            <OfferButton
              slotId={slot.id}
              eligibleCount={data.candidates.length}
              isLive={isLive}
              onFilled={onFilled ? () => onFilled(slot.id) : undefined}
            />
            <p className="mt-2 text-[12px] text-seed-500">
              Smart Family Offer texts all eligible families at once. First confirmation books the opening.
            </p>
          </div>

          {data.candidates.length === 0 ? (
            <p className="text-[13px] text-seed-500">No eligible families found for this slot.</p>
          ) : (
            <div className="space-y-3">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-seed-500 mb-3">
                {data.candidates.length} eligible{" "}
                {data.candidates.length === 1 ? "family" : "families"} · ranked
              </div>
              {data.candidates.slice(0, 8).map((c, i) => (
                <div
                  key={c.childId}
                  className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-seed-200"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-seed-100 text-[11px] font-semibold text-seed-600">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-seed-900 text-[14px]">{c.childName}</span>
                      {c.missedSessionHours > 0 && (
                        <span className="rounded-md bg-melon-100 px-1.5 py-0.5 text-[11px] font-semibold text-melon-800">
                          {c.missedSessionHours.toFixed(1)}h available
                        </span>
                      )}
                      {c.withinAvailability ? (
                        <span className="rounded-md bg-rind-50 px-1.5 py-0.5 text-[11px] font-semibold text-rind-700">
                          In parent window
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          Needs confirmation
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-seed-500 mt-0.5">
                      {c.reason} · {c.driveMinutes} min drive · {c.driveMiles.toFixed(1)} mi
                    </div>
                    {c.warnings.map((w, j) => (
                      <div key={j} className="mt-1 text-[11.5px] text-amber-700">
                        ⚠ {w}
                      </div>
                    ))}
                  </div>
                  <ConfirmButton
                    slotId={slot.id}
                    childId={c.childId}
                    childName={c.childName}
                    onFilled={onFilled ? () => onFilled(slot.id) : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
