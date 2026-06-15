"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface GridAppt {
  id: string; start: string; end: string; status: string; discipline: string;
  locationAddress: string | null; locationNeighborhood: string | null;
  childName: string | null; parentName: string | null; providerName?: string;
  otherProviders?: { name: string; discipline: string }[];
  notes?: string | null;
}

interface WeekDay { dateStr: string; label: string; dayNum: number; isToday: boolean; fullLabel: string; }

// ─── Grid constants ───────────────────────────────────────────────────────────
const START = 6, END = 21, PX = 64;
const TOTAL = END - START;
const HEIGHT = TOTAL * PX;
const LABELS = Array.from({ length: TOTAL + 1 }, (_, i) => {
  const h = START + i;
  return h === 12 ? "12p" : h < 12 ? `${h}a` : `${h - 12}p`;
});

const STATUS_CLR: Record<string, string> = {
  SCHEDULED: "bg-sky-100 border-sky-300 text-sky-900",
  COMPLETED: "bg-rind-100 border-rind-300 text-rind-900",
  FILLED_MAKEUP: "bg-rind-100 border-rind-300 text-rind-900",
  CANCELLED_FAMILY: "bg-amber-100 border-amber-300 text-amber-900",
  CANCELLED_PROVIDER: "bg-amber-100 border-amber-300 text-amber-900",
  OPEN_SLOT: "bg-melon-50 border-melon-300 text-melon-800",
};
const DISC_DOT: Record<string, string> = {
  OT: "bg-amber-500", SLP: "bg-sky-500", PT: "bg-violet-500", MT: "bg-emerald-500", ABA: "bg-orange-500",
};

function mins(iso: string) { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); }
function top(m: number) { return ((m - START * 60) / 60) * PX; }
function ht(m: number) { return (m / 60) * PX; }
function dur(a: GridAppt) { return Math.round((new Date(a.end).getTime() - new Date(a.start).getTime()) / 60_000); }
function t(iso: string) {
  const d = new Date(iso), h = d.getHours(), m = d.getMinutes(), p = h >= 12 ? "p" : "a";
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12}${p}` : `${h12}:${m.toString().padStart(2, "0")}${p}`;
}

function cols(appts: GridAppt[]) {
  const cs: number[] = new Array(appts.length).fill(0), ce: number[] = [];
  appts.forEach((a, i) => {
    const sm = mins(a.start); let c = 0;
    while (ce[c] !== undefined && ce[c] > sm) c++;
    cs[i] = c; ce[c] = sm + dur(a);
  });
  const nc = Math.max(1, ...cs) + 1;

  // Per-appointment span: expand rightward as far as possible without
  // hitting a time-overlapping appointment in the next column.
  const spans = cs.map((c, i) => {
    const myStart = mins(appts[i].start);
    const myEnd = myStart + dur(appts[i]);
    let limit = nc;
    for (let j = 0; j < appts.length; j++) {
      if (j === i || cs[j] <= c) continue;
      const s = mins(appts[j].start), e = s + dur(appts[j]);
      if (s < myEnd && e > myStart) limit = Math.min(limit, cs[j]);
    }
    return Math.max(1, limit - c);
  });

  return { cs, nc, spans };
}

function CompleteButton({ appointmentId, onComplete }: {
  appointmentId: string;
  onComplete: (id: string) => Promise<void>
}) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await onComplete(appointmentId); })}
      disabled={pending}
      className="mt-1 w-full rounded-lg border border-rind-200 bg-rind-50 px-2 py-1.5 text-[12px] font-semibold text-rind-700 hover:bg-rind-100 transition disabled:opacity-50"
    >
      {pending ? "Saving…" : "✓ Mark complete"}
    </button>
  );
}

function UndoCompleteButton({ appointmentId, onUncomplete }: {
  appointmentId: string;
  onUncomplete: (id: string) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await onUncomplete(appointmentId); })}
      disabled={pending}
      className="w-full rounded-lg border border-seed-200 bg-white px-2 py-1.5 text-[12px] font-medium text-seed-600 hover:bg-seed-50 hover:text-seed-800 transition disabled:opacity-50"
    >
      {pending ? "Reverting…" : "↩ Undo — mark as scheduled"}
    </button>
  );
}

function CancelButton({ appointmentId, onCancel, discipline, providerName, startsAt }: {
  appointmentId: string;
  onCancel: (id: string, reason: string) => Promise<{ openSlotId: string | null } | void>;
  discipline?: string;
  providerName?: string;
  startsAt?: string;
}) {
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("family_cancel");
  const [pending, start] = useTransition();
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);

  if (openSlotId && discipline && providerName && startsAt) {
    // Show SlotCard-style replacement panel
    const end = new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
    return (
      <div className="mt-2 rounded-lg border border-rind-200 bg-rind-50 p-2">
        <div className="mb-1.5 text-[11px] font-semibold text-rind-700">✓ Cancelled — find a replacement family:</div>
        <a href={`/marketplace`}
          className="block w-full rounded-lg bg-melon-500 px-2 py-1.5 text-center text-[12px] font-semibold text-white hover:bg-melon-600 transition">
          Open Recovery Queue →
        </a>
      </div>
    );
  }

  if (!confirm) return (
    <button onClick={() => setConfirm(true)}
      className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-100 transition">
      Cancel appointment
    </button>
  );
  return (
    <div className="mt-2 space-y-1.5">
      <select value={reason} onChange={e => setReason(e.target.value)}
        className="w-full rounded-lg border border-seed-200 px-2 py-1.5 text-[12px]">
        <option value="family_cancel">Family cancelled</option>
        <option value="provider_sick">Provider sick/unavailable</option>
        <option value="no_show">No show</option>
        <option value="scheduling_conflict">Scheduling conflict</option>
      </select>
      <div className="flex gap-1.5">
        <button onClick={() => setConfirm(false)} className="flex-1 rounded-lg border border-seed-200 px-2 py-1.5 text-[11px] font-medium text-seed-600">Keep</button>
        <button onClick={() => start(async () => {
          const result = await onCancel(appointmentId, reason);
          setConfirm(false);
          if (result && "openSlotId" in result && result.openSlotId) {
            setOpenSlotId(result.openSlotId);
          }
        })}
          disabled={pending}
          className="flex-1 rounded-lg bg-amber-500 px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">
          {pending ? "…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}

/** Fixed bottom panel — always fully visible, never clipped by scroll container */
function ApptPanel({ appt, onClose, onComplete, onCancel, onUncomplete }: {
  appt: GridAppt;
  onClose: () => void;
  onComplete?: (id: string) => Promise<void>;
  onCancel?: (id: string, reason: string) => Promise<{ openSlotId: string | null } | void>;
  onUncomplete?: (id: string) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl border border-seed-200 bg-white shadow-lift"
        onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-seed-200" />
        </div>
        <div className="px-5 pb-6 pt-2 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[16px] font-bold text-seed-900">{appt.childName ?? "Open slot"}</div>
              <div className="text-[13px] text-seed-500">{t(appt.start)}–{t(appt.end)} · {dur(appt)} min · {appt.discipline}</div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-seed-400 hover:bg-seed-100">✕</button>
          </div>
          {/* Details */}
          <div className="space-y-1.5 text-[13px]">
            {appt.parentName && (
              <div className="flex gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-seed-400 w-20 shrink-0 mt-0.5">Parent</span>
                <span className="text-seed-800">{appt.parentName}</span>
              </div>
            )}
            {appt.providerName && (
              <div className="flex gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-seed-400 w-20 shrink-0 mt-0.5">Therapist</span>
                <span className="text-seed-800">{appt.providerName}</span>
              </div>
            )}
            {appt.locationNeighborhood && (
              <div className="flex gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-seed-400 w-20 shrink-0 mt-0.5">Location</span>
                <span className="text-seed-800">📍 {appt.locationNeighborhood}</span>
              </div>
            )}
            {appt.otherProviders && appt.otherProviders.length > 0 && (
              <div className="flex gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-seed-400 w-20 shrink-0 mt-0.5">Also sees</span>
                <span className="text-seed-800">{appt.otherProviders.map(p => `${p.name} (${p.discipline})`).join(" · ")}</span>
              </div>
            )}
            {appt.notes && <div className="rounded-lg bg-amber-50 px-3 py-2 text-[12px] text-amber-700">⚠ {appt.notes}</div>}
          </div>
          {/* Actions */}
          {(onComplete || onCancel) && (appt.status === "SCHEDULED" || appt.status === "FILLED_MAKEUP") && (
            <div className="flex gap-2 pt-1">
              {onComplete && (appt.status === "SCHEDULED" || appt.status === "FILLED_MAKEUP") && (
                <CompleteButton appointmentId={appt.id} onComplete={async (id) => { await onComplete(id); onClose(); }} />
              )}
              {onCancel && appt.status === "SCHEDULED" && (
                <div className="flex-1">
                  <CancelButton
                    appointmentId={appt.id}
                    onCancel={async (id, reason) => { const r = await onCancel(id, reason); onClose(); return r; }}
                    discipline={appt.discipline}
                    providerName={appt.providerName}
                    startsAt={appt.start}
                  />
                </div>
              )}
            </div>
          )}
          {/* Undo complete */}
          {appt.status === "COMPLETED" && onUncomplete && (
            <div className="pt-1">
              <UndoCompleteButton appointmentId={appt.id} onUncomplete={async (id) => { await onUncomplete(id); onClose(); }} />
            </div>
          )}
          {/* Undo cancel */}
          {(appt.status === "CANCELLED_FAMILY" || appt.status === "CANCELLED_PROVIDER") && onUncomplete && (
            <div className="pt-1">
              <button
                onClick={() => { onUncomplete(appt.id).then(onClose); }}
                className="w-full rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[12px] font-medium text-amber-700 hover:bg-amber-100 transition"
              >
                ↩ Restore — mark as scheduled
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InlineActionBar({ appointmentId, onComplete, onCancel, discipline, providerName, startsAt, clr }: {
  appointmentId: string;
  onComplete?: (id: string) => Promise<void>;
  onCancel?: (id: string, reason: string) => Promise<{ openSlotId: string | null } | void>;
  discipline?: string; providerName?: string; startsAt?: string;
  clr: string;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("family_cancel");
  const [openSlotId, setOpenSlotId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const barCls = clr.replace("bg-", "bg-").replace("border-", "border-").replace("text-", "text-");

  if (openSlotId) return (
    <a href="/marketplace" className="block rounded-b-lg bg-melon-500 px-2 py-1 text-center text-[10px] font-semibold text-white hover:bg-melon-600">
      Find replacement →
    </a>
  );

  if (cancelling) return (
    <div className={`rounded-b-lg border border-t-0 ${barCls} px-1.5 py-1 space-y-1`}>
      <select value={reason} onChange={e => setReason(e.target.value)}
        className="w-full rounded text-[10px] border border-seed-200 bg-white px-1 py-0.5">
        <option value="family_cancel">Family cancelled</option>
        <option value="provider_sick">Provider unavailable</option>
        <option value="no_show">No show</option>
        <option value="scheduling_conflict">Scheduling conflict</option>
      </select>
      <div className="flex gap-1">
        <button onClick={() => setCancelling(false)} className="flex-1 rounded text-[10px] font-medium text-seed-600 bg-white border border-seed-200 py-0.5">Keep</button>
        <button disabled={pending} onClick={() => start(async () => {
          const res = await onCancel!(appointmentId, reason);
          setCancelling(false);
          if (res && "openSlotId" in res && res.openSlotId) setOpenSlotId(res.openSlotId);
        })} className="flex-1 rounded bg-amber-500 text-[10px] font-semibold text-white py-0.5 disabled:opacity-50">
          {pending ? "…" : "Confirm"}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`flex rounded-b-lg border border-t-0 overflow-hidden ${barCls}`}>
      {onComplete && (
        <button disabled={pending} onClick={() => start(async () => { await onComplete(appointmentId); })}
          className="flex-1 py-1 text-[10px] font-semibold text-rind-700 bg-rind-50 hover:bg-rind-100 transition disabled:opacity-50">
          ✓ Done
        </button>
      )}
      {onCancel && (
        <button onClick={() => setCancelling(true)}
          className="flex-1 py-1 text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition border-l border-amber-200">
          ✗ Cancel
        </button>
      )}
    </div>
  );
}

function DayCol({ appts, active, setActive, onCancel, onComplete, onUncomplete }: {
  appts: GridAppt[]; active: string | null; setActive: (id: string | null) => void;
  onCancel?: (appointmentId: string, reason: string) => Promise<{ openSlotId: string | null } | void>;
  onComplete?: (appointmentId: string) => Promise<void>;
  onUncomplete?: (appointmentId: string) => Promise<void>;
}) {
  const sorted = [...appts].sort((a, b) => a.start.localeCompare(b.start));
  const { cs, nc, spans } = cols(sorted);
  return (
    <div className="relative flex-1 bg-white" style={{ height: HEIGHT }}>
      {Array.from({ length: TOTAL }).map((_, i) => <div key={i} className="absolute left-0 right-0 border-t border-seed-100" style={{ top: i * PX }} />)}
      {Array.from({ length: TOTAL }).map((_, i) => <div key={`h${i}`} className="absolute left-0 right-0 border-t border-seed-50" style={{ top: i * PX + PX / 2 }} />)}
      {sorted.map((a, i) => {
        const sm = mins(a.start), d = dur(a), tp = top(sm), h = Math.max(ht(d), 24);
        const clr = STATUS_CLR[a.status] ?? STATUS_CLR.SCHEDULED;
        const dot = DISC_DOT[a.discipline] ?? "bg-seed-400";
        const isAct = active === a.id, pct = 100 / nc;
        return (
          <div key={a.id} className="absolute flex flex-col" style={{ top: tp, height: h, left: `${cs[i] * pct + 0.4}%`, width: `${spans[i] * pct - 0.8}%` }}>
            <button onClick={() => setActive(isAct ? null : a.id)}
              className={`flex flex-1 flex-col overflow-hidden rounded-lg border px-1.5 py-1 text-left transition hover:shadow-md ${clr} ${isAct ? "ring-2 ring-melon-400" : ""} ${(onComplete || onCancel) && h >= 58 && a.status === "SCHEDULED" ? "rounded-b-none border-b-0" : ""}`}>
              <div className="flex items-center gap-1 min-w-0">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                <span className="truncate text-[11px] font-semibold">{a.childName ?? "Open"}</span>
              </div>
              {h > 24 && <span className="truncate text-[10px] opacity-70">{t(a.start)} · {a.discipline}</span>}
              {h > 40 && a.parentName && <span className="truncate text-[10px] opacity-60">👤 {a.parentName}</span>}
              {h > 56 && a.locationNeighborhood && <span className="truncate text-[10px] opacity-50">📍 {a.locationNeighborhood}</span>}
              {h > 72 && <span className="truncate text-[10px] opacity-40">{dur(a)} min</span>}
            </button>
            {/* Inline action bar — always visible, no popup needed */}
            {(onComplete || onCancel) && h >= 58 && a.status === "SCHEDULED" && (
              <InlineActionBar appointmentId={a.id} onComplete={onComplete} onCancel={onCancel}
                discipline={a.discipline} providerName={a.providerName} startsAt={a.start} clr={clr} />
            )}
            {isAct && (
              <ApptPanel
                appt={a}
                onClose={() => setActive(null)}
                onComplete={onComplete}
                onCancel={onCancel}
                onUncomplete={onUncomplete}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WeekGrid({ weekDays, byDate, prevHref, nextHref, isCurrentWeek, weekLabel, initialDayIndex, initialMode, onCancel, onComplete, onUncomplete }: {
  weekDays: WeekDay[];
  byDate: Record<string, GridAppt[]>;
  prevHref: string; nextHref: string;
  isCurrentWeek: boolean; weekLabel: string;
  initialDayIndex?: number;
  initialMode?: "day" | "week";
  onCancel?: (appointmentId: string, reason: string) => Promise<{ openSlotId: string | null } | void>;
  onComplete?: (appointmentId: string) => Promise<void>;
  onUncomplete?: (appointmentId: string) => Promise<void>;
}) {
  const router = useRouter();
  const startIdx = Math.min(initialDayIndex ?? weekDays.findIndex(d => d.isToday), weekDays.length - 1);
  const [selDate, setSelDate] = useState(startIdx >= 0 ? weekDays[startIdx].dateStr : (weekDays.find(d => d.isToday)?.dateStr ?? weekDays[0].dateStr));
  const [view, setView] = useState<"day" | "week">(initialMode ?? "day");
  const [active, setActive] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const appts = view === "week" ? Object.values(byDate).flat() : (byDate[selDate] ?? []);
    const earliest = appts.reduce((min, a) => { const m = mins(a.start); return m < min ? m : min; }, Infinity);
    scrollRef.current.scrollTop = Math.max(0, top(earliest === Infinity ? 8 * 60 : earliest) - 72);
  }, [selDate, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const selAppts = (byDate[selDate] ?? []).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Week mode: top nav with week label + Day/Week toggle */}
      {view === "week" && (
        <div className="flex shrink-0 items-center justify-between border-b border-seed-200 bg-white px-4 py-2.5">
          <Link href={prevHref} className="flex h-9 w-9 items-center justify-center rounded-xl bg-seed-100 text-[20px] text-seed-700 hover:bg-seed-200">‹</Link>
          <div className="text-center">
            <div className="font-display text-[16px] font-medium text-seed-900">{weekLabel}</div>
            {!isCurrentWeek && <Link href="?" className="text-[11px] font-medium text-melon-600">← Today</Link>}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-seed-100 p-0.5 text-[12px] font-semibold">
              {(["day","week"] as const).map(m => (
                <button key={m} onClick={() => setView(m)}
                  className={`rounded-md px-3 py-1.5 capitalize transition ${view === m ? "bg-white text-seed-900 shadow-sm" : "text-seed-500"}`}>
                  {m}
                </button>
              ))}
            </div>
            <Link href={nextHref} className="flex h-9 w-9 items-center justify-center rounded-xl bg-seed-100 text-[20px] text-seed-700 hover:bg-seed-200">›</Link>
          </div>
        </div>
      )}
      {/* Day mode: single nav bar with prev/next + full date + Day/Week toggle */}
      {view === "day" && (() => {
        const idx = weekDays.findIndex(d => d.dateStr === selDate);
        const selDay = weekDays[idx];
        // Format: "June 8, 2026"
        const [sy, sm, sd] = selDate.split("-").map(Number);
        const dtObj = new Date(sy, sm - 1, sd);
        const monthDay = dtObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        const visitCount = (byDate[selDate] ?? []).length;
        return (
          <div className="flex shrink-0 items-center gap-3 border-b border-seed-200 bg-white px-4 py-2.5">
            <button
              onClick={() => idx === 0 ? router.push(prevHref + "&day=6") : setSelDate(weekDays[idx - 1].dateStr)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-seed-100 text-[18px] text-seed-700 hover:bg-seed-200">‹</button>
            <div className="flex-1 text-center">
              <div className={`text-[15px] font-bold ${selDay?.isToday ? "text-melon-600" : "text-seed-900"}`}>{selDay?.fullLabel}</div>
              <div className="text-[13px] text-seed-500">{monthDay} · {visitCount} visit{visitCount !== 1 ? "s" : ""}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex rounded-lg bg-seed-100 p-0.5 text-[12px] font-semibold">
                {(["day","week"] as const).map(m => (
                  <button key={m} onClick={() => setView(m)}
                    className={`rounded-md px-3 py-1.5 capitalize transition ${view === m ? "bg-white text-seed-900 shadow-sm" : "text-seed-500"}`}>
                    {m}
                  </button>
                ))}
              </div>
              <button
                onClick={() => idx === weekDays.length - 1 ? router.push(nextHref + "&day=0") : setSelDate(weekDays[idx + 1].dateStr)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-seed-100 text-[18px] text-seed-700 hover:bg-seed-200">›</button>
            </div>
          </div>
        );
      })()}
      {/* Grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-auto">
        {view === "day" && (
          <div className="flex min-w-[300px]">
            <div className="w-10 shrink-0 border-r border-seed-200 bg-white">
              <div className="relative" style={{ height: HEIGHT }}>
                {LABELS.map((l, i) => <div key={i} className="absolute right-1 text-[10px] text-seed-400" style={{ top: i * PX - 6 }}>{l}</div>)}
              </div>
            </div>
            <div className="flex-1">
              {selAppts.length === 0
                ? <div className="flex h-32 items-center justify-center text-[14px] text-seed-400">No visits on {weekDays.find(d => d.dateStr === selDate)?.fullLabel}.</div>
                : <DayCol appts={selAppts} active={active} setActive={setActive} onCancel={onCancel} onComplete={onComplete} onUncomplete={onUncomplete} />}
            </div>
          </div>
        )}
        {view === "week" && (
          <div className="flex min-w-[560px]">
            <div className="w-10 shrink-0 border-r border-seed-200 bg-white" style={{ paddingTop: 40 }}>
              <div className="relative" style={{ height: HEIGHT }}>
                {LABELS.map((l, i) => <div key={i} className="absolute right-1 text-[10px] text-seed-400" style={{ top: i * PX - 6 }}>{l}</div>)}
              </div>
            </div>
            <div className="flex flex-1">
              {weekDays.map(d => {
                const da = (byDate[d.dateStr] ?? []).sort((a, b) => a.start.localeCompare(b.start));
                return (
                  <div key={d.dateStr} className="flex flex-1 flex-col border-r border-seed-100 last:border-r-0">
                    <div className={`sticky top-0 z-10 border-b py-2 text-center ${d.isToday ? "border-melon-200 bg-melon-50" : "border-seed-200 bg-white"}`}>
                      <div className={`text-[10px] font-semibold uppercase ${d.isToday ? "text-melon-600" : "text-seed-500"}`}>{d.label}</div>
                      <div className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold ${d.isToday ? "bg-melon-500 text-white" : "text-seed-700"}`}>{d.dayNum}</div>
                      {da.length > 0 && <div className="text-[10px] text-seed-400">{da.length}</div>}
                    </div>
                    <DayCol appts={da} active={active} setActive={setActive} onCancel={onCancel} onComplete={onComplete} onUncomplete={onUncomplete} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-seed-200 bg-white px-4 py-2">
        {view === "day" && selAppts.length > 0 && (
          <div className="mb-1.5 text-[13px] text-seed-600">
            <span className="font-semibold text-seed-900">{selAppts.length}</span> visits · {weekDays.find(d => d.dateStr === selDate)?.fullLabel} · {t(selAppts[0].start)} – {t(selAppts[selAppts.length - 1].end)}
          </div>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {[
            { color: "bg-sky-200", label: "Scheduled" },
            { color: "bg-rind-200", label: "Completed" },
            { color: "bg-amber-200", label: "Cancelled" },
            { color: "bg-melon-200", label: "Open slot" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[11px] text-seed-500">
              <span className={`h-2.5 w-2.5 rounded-sm ${color}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
