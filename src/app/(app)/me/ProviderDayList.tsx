"use client";

// Provider Day View — full-width appointment cards, not a cramped calendar grid.
// Uses horizontal space: time on the left, details in the middle, actions on the right.

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GridAppt } from "@/components/WeekGrid";
import { WeekGrid } from "@/components/WeekGrid";
import { getSlotCandidates } from "@/app/(app)/marketplace/actions";

interface WeekDay { dateStr: string; label: string; dayNum: number; isToday: boolean; fullLabel: string; }

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SCHEDULED:        { label: "Upcoming",   cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  COMPLETED:        { label: "Completed",  cls: "bg-rind-50 text-rind-700 ring-rind-200" },
  FILLED_MAKEUP:    { label: "Makeup",     cls: "bg-rind-50 text-rind-700 ring-rind-200" },
  CANCELLED_FAMILY: { label: "Cancelled",  cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  CANCELLED_PROVIDER: { label: "Cancelled", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  OPEN_SLOT:        { label: "Open slot",  cls: "bg-melon-50 text-melon-700 ring-melon-200" },
};
const DISC_COLOR: Record<string, string> = {
  OT: "bg-amber-100 text-amber-800", PT: "bg-violet-100 text-violet-800",
  SLP: "bg-sky-100 text-sky-800", MT: "bg-emerald-100 text-emerald-800", ABA: "bg-orange-100 text-orange-800",
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function dur(a: GridAppt) {
  return Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 60_000);
}

function FindFamiliesPanel({ slotId, providerName, discipline, startsAt, onClose }: {
  slotId: string;
  providerName?: string;
  discipline?: string;
  startsAt?: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<{ candidates: any[]; leg: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    getSlotCandidates(slotId).then(r => { setData(r); setLoading(false); }).catch(() => setLoading(false));
  }, [slotId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-seed-900/50 md:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl md:rounded-2xl bg-white shadow-lift max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-seed-100 px-5 py-4 shrink-0">
          <h2 className="text-[17px] font-bold text-seed-900">Find families for this slot</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-seed-400 hover:bg-seed-100">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && <div className="text-center text-seed-500 py-8">Finding eligible families…</div>}
          {!loading && data && (
            <>
              {/* SMS preview */}
              {data.candidates.length > 0 && (
                <div className="rounded-2xl border border-rind-200 bg-rind-50 overflow-hidden">
                  <div className="px-4 py-2 text-center border-b border-rind-200 bg-white">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-seed-400">Text each family will receive</div>
                  </div>
                  <div className="p-4 bg-seed-50">
                    <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-rind-500 px-3.5 py-2.5 text-[13px] leading-snug text-white whitespace-pre-line">
                      {`A make-up appointment is available${providerName ? ` with ${providerName.split(" ")[0]}` : ""}.\nTap to view and claim: wmln.app/o/ab12cd34\n\nSent by TinyWatermelon.com`}
                    </div>
                    <div className="mt-1 text-right text-[10px] text-seed-500">Delivered to each family below</div>
                  </div>
                </div>
              )}
              {/* Family list */}
              {data.candidates.length === 0 ? (
                <div className="text-center text-seed-500 py-4">No eligible families found for this slot.</div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-seed-400">
                    {data.candidates.length} eligible {data.candidates.length === 1 ? "family" : "families"}
                  </div>
                  {data.candidates.slice(0, 8).map((c: any, i: number) => (
                    <div key={c.childId} className="rounded-xl bg-seed-50 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-seed-200 text-[11px] font-semibold text-seed-600 mt-0.5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-seed-900">{c.childName}</div>
                          <div className="flex flex-wrap gap-3 mt-1">
                            {c.drive && (
                              <span className={`text-[12px] font-medium ${
                                c.drive.band === "heavy" ? "text-melon-700" :
                                c.drive.minutes > 20 ? "text-amber-600" : "text-rind-700"
                              }`}>
                                🚗 {c.drive.minutes} min drive
                                {c.drive.band === "heavy" && " · heavy traffic"}
                              </span>
                            )}
                            {c.bucketRoom !== undefined && c.bucketRoom > 0 && discipline && (
                              <span className="text-[12px] font-medium text-sky-700">
                                📋 {c.bucketRoom}h {discipline} available this month
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {/* Send button */}
        {!loading && data && data.candidates.length > 0 && !sent && (
          <div className="shrink-0 border-t border-seed-100 px-5 py-4">
            <button
              disabled={pending}
              onClick={() => start(async () => {
                const { actionSendOffer } = await import("@/app/(app)/marketplace/actions");
                await actionSendOffer(slotId);
                setSent(true);
              })}
              className="w-full rounded-xl bg-melon-500 py-3 text-[15px] font-semibold text-white hover:bg-melon-600 disabled:opacity-50 transition"
            >
              {pending ? "Sending…" : `Send Smart Offer to ${data.candidates.length} families`}
            </button>
          </div>
        )}
        {sent && (
          <div className="shrink-0 border-t border-seed-100 px-5 py-4">
            <div className="rounded-xl bg-rind-50 py-3 text-center text-[14px] font-semibold text-rind-700">
              ✓ Offer sent! First family to confirm books the slot.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ApptCard({ a, onCancel, onComplete, onUncomplete }: {
  a: GridAppt;
  onCancel?: (id: string, reason: string) => Promise<{ openSlotId: string | null } | void>;
  onComplete?: (id: string) => Promise<void>;
  onUncomplete?: (id: string) => Promise<void>;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("family_cancel");
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [showFindFamilies, setShowFindFamilies] = useState(false);
  const [findFamiliesSlotId, setFindFamiliesSlotId] = useState<string | null>(null);
  const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.SCHEDULED;

  return (
    <div className={`rounded-2xl border bg-white shadow-card overflow-hidden ${
      a.status === "SCHEDULED" ? "border-seed-200" :
      a.status.startsWith("CANCELLED") ? "border-amber-200 opacity-60" : "border-seed-200"
    }`}>
      <div className="flex">
        {/* Time column — always left */}
        <div className="flex w-20 md:w-24 shrink-0 flex-col items-center justify-center border-r border-seed-100 bg-seed-50 px-2 py-3 md:px-3 md:py-4">
          <div className="text-[16px] md:text-[18px] font-bold text-seed-900">{fmtTime(a.start)}</div>
          <div className="mt-0.5 text-[10px] md:text-[11px] text-seed-400">{dur(a)} min</div>
          <div className="mt-1 text-[10px] md:text-[11px] font-semibold text-seed-500">{fmtTime(a.end)}</div>
        </div>

        {/* Right side: details + actions stacked on mobile, side by side on desktop */}
        <div className="flex flex-1 flex-col md:flex-row min-w-0">
          {/* Details */}
          <div className="flex-1 px-3 py-2.5 md:px-4 md:py-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[16px] md:text-[17px] font-bold text-seed-900">{a.childName ?? "Open slot"}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DISC_COLOR[a.discipline] ?? "bg-seed-100 text-seed-700"}`}>
                {a.discipline}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${st.cls}`}>
                {st.label}
              </span>
            </div>
            {a.parentName && (
              <div className="text-[13px] text-seed-600">
                <span className="font-semibold">Parent:</span> {a.parentName}
              </div>
            )}
            {a.locationNeighborhood && (
              <div className="text-[13px] text-seed-500">📍 {a.locationNeighborhood}</div>
            )}
            {a.otherProviders && a.otherProviders.length > 0 && (
              <div className="mt-1 text-[12px] text-seed-400">
                Also sees: {a.otherProviders.map(p => `${p.name} (${p.discipline})`).join(" · ")}
              </div>
            )}
            {a.notes && (
              <div className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-[12px] text-amber-700">⚠ {a.notes}</div>
            )}
            {/* Find families — only after fresh cancellation (shows openSlotId) or for existing OPEN_SLOT records */}
            {(openSlotId || a.status === "OPEN_SLOT") && (
              <>
                {showFindFamilies && findFamiliesSlotId && (
                  <FindFamiliesPanel slotId={findFamiliesSlotId} providerName={a.providerName} discipline={a.discipline} startsAt={a.start} onClose={() => setShowFindFamilies(false)} />
                )}
                <button
                  onClick={() => {
                    const sid = openSlotId || (a.status === "OPEN_SLOT" ? a.id : null);
                    if (sid) { setFindFamiliesSlotId(sid); setShowFindFamilies(true); }
                    else { window.location.href = "/marketplace"; }
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-melon-500 px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-melon-600 transition"
                >
                  🔍 Find families
                </button>
              </>
            )}
          </div>

          {/* Actions — full width on mobile, right column on desktop */}
          {a.status === "SCHEDULED" && (onComplete || onCancel) && (
            <div className="flex gap-2 border-t border-seed-100 px-3 py-2.5 md:border-t-0 md:border-l md:flex-col md:px-3 md:py-3 md:justify-center md:shrink-0">
              {onComplete && !cancelling && !openSlotId && (
                <button
                  disabled={pending}
                  onClick={() => start(async () => { await onComplete(a.id); })}
                  className="flex-1 md:flex-none rounded-xl bg-rind-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-rind-600 disabled:opacity-50 transition whitespace-nowrap w-full md:w-auto"
                >
                  ✓ Complete
                </button>
              )}
              {onCancel && !openSlotId && (
                <>
                  {!cancelling ? (
                    <button
                      onClick={() => setCancelling(true)}
                      className="flex-1 md:flex-none rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-[13px] font-semibold text-amber-700 hover:bg-amber-100 transition whitespace-nowrap w-full md:w-auto"
                    >
                      ✗ Cancel
                    </button>
                  ) : (
                    <div className="flex-1 space-y-1.5 min-w-[140px]">
                      <select value={reason} onChange={e => setReason(e.target.value)}
                        className="w-full rounded-lg border border-seed-200 bg-white px-2 py-1.5 text-[12px] focus:border-melon-400 focus:outline-none">
                        <option value="family_cancel">Family cancelled</option>
                        <option value="provider_sick">Provider unavailable</option>
                        <option value="no_show">No show</option>
                        <option value="scheduling_conflict">Scheduling conflict</option>
                      </select>
                      <div className="flex gap-1">
                        <button onClick={() => setCancelling(false)}
                          className="flex-1 rounded-lg border border-seed-200 bg-white px-2 py-1.5 text-[11px] font-medium text-seed-600 hover:bg-seed-50">
                          Keep
                        </button>
                        <button
                          disabled={pending}
                          onClick={() => start(async () => {
                            const r = await onCancel(a.id, reason);
                            setCancelling(false);
                            if (r && "openSlotId" in r && r.openSlotId) setOpenSlotId(r.openSlotId);
                          })}
                          className="flex-1 rounded-lg bg-amber-500 px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
                          {pending ? "…" : "Confirm"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Undo buttons — complete or cancel can both be reversed */}
          {(a.status === "COMPLETED" || a.status === "FILLED_MAKEUP") && onUncomplete && (
            <div className="flex items-center border-t border-seed-100 px-3 py-2 md:border-t-0 md:border-l md:px-3 md:py-3 md:shrink-0">
              <button
                disabled={pending}
                onClick={() => start(async () => { await onUncomplete(a.id); })}
                className="rounded-xl border border-seed-200 bg-white px-3 py-2 text-[12px] font-medium text-seed-500 hover:bg-seed-50 hover:text-seed-800 disabled:opacity-50 transition whitespace-nowrap"
              >
                ↩ Undo
              </button>
            </div>
          )}
          {(a.status === "CANCELLED_FAMILY" || a.status === "CANCELLED_PROVIDER") && onUncomplete && (
            <div className="flex items-center border-t border-seed-100 px-3 py-2 md:border-t-0 md:border-l md:px-3 md:py-3 md:shrink-0">
              <button
                disabled={pending}
                onClick={() => start(async () => { await onUncomplete(a.id); })}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition whitespace-nowrap"
              >
                ↩ Restore
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProviderDayList({ weekDays, byDate, prevHref, nextHref, initialDayIndex, onCancel, onComplete, onUncomplete, onScrollChange }: {
  weekDays: WeekDay[];
  byDate: Record<string, GridAppt[]>;
  prevHref: string;
  nextHref: string;
  initialDayIndex?: number;
  onCancel?: (id: string, reason: string) => Promise<{ openSlotId: string | null } | void>;
  onComplete?: (id: string) => Promise<void>;
  onUncomplete?: (id: string) => Promise<void>;
  onScrollChange?: (scrolled: boolean) => void;
}) {
  const router = useRouter();
  const startIdx = Math.max(0, Math.min(initialDayIndex ?? weekDays.findIndex(d => d.isToday), weekDays.length - 1));
  const [selIdx, setSelIdx] = useState(startIdx >= 0 ? startIdx : 0);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [pillsVisible, setPillsVisible] = useState(true);

  const selDay = weekDays[selIdx];
  const appts = (byDate[selDay?.dateStr ?? ""] ?? []).sort((a, b) => a.start.localeCompare(b.start));

  const [sy, sm, sd] = (selDay?.dateStr ?? "2000-01-01").split("-").map(Number);
  const fullDate = new Date(sy, sm - 1, sd).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  if (viewMode === "week") {
    // WeekGrid renders its own nav (back/forward + Day/Week toggle) — no wrapper needed
    return (
      <div className="h-full overflow-hidden">
        <WeekGrid
          weekDays={weekDays}
          byDate={byDate}
          prevHref={prevHref}
          nextHref={nextHref}
          isCurrentWeek={false}
          weekLabel=""
          initialDayIndex={initialDayIndex}
          initialMode="week"
          onCancel={onCancel}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Day nav */}
      <div className="flex shrink-0 items-center gap-3 border-b border-seed-200 bg-white px-4 py-3">
        <button
          onClick={() => {
            if (selIdx === 0) router.push(prevHref + "&day=6");
            else setSelIdx(selIdx - 1);
          }}
          className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-seed-100 text-[20px] text-seed-700 hover:bg-seed-200">‹</button>
        <div className="flex-1 min-w-0">
          <div className={`text-[18px] md:text-[20px] font-bold truncate ${selDay?.isToday ? "text-melon-600" : "text-seed-900"}`}>
            {selDay?.fullLabel}
          </div>
          <div className="text-[12px] text-seed-400 truncate">{fullDate}</div>
        </div>
        <div className="shrink-0 text-center">
          <div className="text-[22px] font-bold text-seed-900">{appts.length}</div>
          <div className="text-[10px] font-semibold uppercase text-seed-400">visits</div>
        </div>
        {/* Day/Week toggle */}
        <div className="flex rounded-lg bg-seed-100 p-0.5 text-[12px] font-semibold shrink-0">
          {(["day", "week"] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`rounded-md px-3 py-1.5 capitalize transition ${viewMode === m ? "bg-white text-seed-900 shadow-sm" : "text-seed-500"}`}>
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            if (selIdx === weekDays.length - 1) router.push(nextHref + "&day=0");
            else setSelIdx(selIdx + 1);
          }}
          className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-xl bg-seed-100 text-[20px] text-seed-700 hover:bg-seed-200">›</button>
      </div>

      {/* Day pills — quick jump (collapses on scroll to save space) */}
      <div className={`shrink-0 bg-white overflow-hidden transition-all duration-200 md:flex ${
        pillsVisible ? "max-h-14 border-b border-seed-100" : "max-h-0 border-0"
      }`}>
      <div className="flex">
        {weekDays.map((d, i) => {
          const cnt = (byDate[d.dateStr] ?? []).length;
          const active = i === selIdx;
          return (
            <button key={d.dateStr} onClick={() => setSelIdx(i)}
              className={`flex flex-1 flex-col items-center py-2 transition ${active ? "border-b-2 border-melon-500" : ""}`}>
              <span className={`text-[10px] font-semibold uppercase ${active ? "text-melon-600" : "text-seed-400"}`}>{d.label}</span>
              <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold ${
                d.isToday ? "bg-melon-500 text-white" : active ? "bg-seed-100 text-seed-900" : "text-seed-600"}`}>{d.dayNum}</span>
              {cnt > 0 && <span className={`text-[10px] font-semibold ${active ? "text-melon-500" : "text-seed-400"}`}>{cnt}</span>}
            </button>
          );
        })}
      </div>
      </div>

      {/* Appointment list */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        onScroll={(e) => {
          const scrolled = (e.currentTarget.scrollTop ?? 0) > 48;
          setPillsVisible(!scrolled);
          onScrollChange?.(scrolled);
        }}
      >
        {appts.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-seed-200 bg-white text-[15px] text-seed-400">
            No visits on {selDay?.fullLabel}.
          </div>
        ) : appts.map(a => (
          <ApptCard key={a.id} a={a} onCancel={onCancel} onComplete={onComplete} onUncomplete={onUncomplete} />
        ))}
      </div>
    </div>
  );
}
