"use client";

import { useState, useTransition } from "react";
import {
  actionMarkComplete,
  actionMarkRunningLate,
  actionLogNoShow,
  actionCancelVisit,
} from "./actions";
import type { RankedCandidate } from "@/lib/matching";

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface ApptView {
  id: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  discipline: string;
  locationAddress: string | null;
  locationNeighborhood?: string | null;
  childName: string | null;
  parentPhone: string | null;
  notes: string | null;
}

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  SCHEDULED:        { label: "Scheduled",    cls: "bg-seed-100 text-seed-700" },
  COMPLETED:        { label: "Complete ✓",   cls: "bg-rind-100 text-rind-800" },
  FILLED_MAKEUP:    { label: "Recovered ✓",  cls: "bg-rind-100 text-rind-800" },
  CANCELLED_FAMILY: { label: "Family cxl",   cls: "bg-amber-50 text-amber-800" },
  OPEN_SLOT:        { label: "Open",         cls: "bg-melon-50 text-melon-700" },
};

export function AppointmentCard({
  appt,
  matches,
}: {
  appt: ApptView;
  matches: RankedCandidate[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(appt.status);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pill = STATUS_PILL[status] ?? STATUS_PILL.SCHEDULED;
  const isDone = status === "COMPLETED" || status === "FILLED_MAKEUP";
  const isCancelled = status.startsWith("CANCELLED") || status === "OPEN_SLOT";
  const dur = Math.round((appt.endsAt.getTime() - appt.startsAt.getTime()) / 60_000);

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    start(async () => {
      setNote(null);
      const r = await fn();
      if (!r.ok) setNote(r.error ?? "Something went wrong");
    });
  }

  return (
    <div className={`rounded-2xl border bg-white shadow-card transition ${isDone ? "border-rind-100 opacity-80" : isCancelled ? "border-amber-100" : "border-seed-200"}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="w-14 shrink-0">
          <div className="text-[16px] font-semibold tabular-nums text-seed-900">{fmtTime(appt.startsAt)}</div>
          <div className="text-[12px] text-seed-500">{dur}m</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate text-[15px] font-semibold text-seed-900">
              {appt.childName ?? "Open slot"}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-seed-500">
              {appt.discipline}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[13px] text-seed-500">
            {appt.locationNeighborhood ?? appt.locationAddress ?? "Visit location"}
          </div>
          {note && <div className="mt-1 text-[12px] font-semibold text-amber-700">{note}</div>}
        </div>
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${pill.cls}`}>
          {pill.label}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-seed-100 px-4 pb-4 pt-3 space-y-3">
          {/* Contact + directions */}
          <div className="grid grid-cols-2 gap-2">
            {appt.parentPhone && (
              <a href={`tel:${appt.parentPhone.replace(/\D/g, "")}`}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-seed-100 px-3 py-3 text-[13px] font-semibold text-seed-800 active:bg-seed-200">
                📞 Call family
              </a>
            )}
            <a href={`https://maps.apple.com/?address=${encodeURIComponent(appt.locationAddress ?? "4761 Cass St San Diego CA")}`}
              target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-seed-100 px-3 py-3 text-[13px] font-semibold text-seed-800 active:bg-seed-200">
              🗺️ Directions
            </a>
          </div>

          {/* Action buttons — only when SCHEDULED */}
          {status === "SCHEDULED" && (
            <div className="grid grid-cols-2 gap-2">
              <button disabled={pending} onClick={() => act(async () => { const r = await actionMarkComplete(appt.id); if (r.ok) setStatus("COMPLETED"); return r; })}
                className="rounded-xl bg-rind-500 px-3 py-3 text-[14px] font-semibold text-white shadow-sm disabled:opacity-50">
                ✓ Complete
              </button>
              <button disabled={pending} onClick={() => act(async () => { const r = await actionMarkRunningLate(appt.id); if (r.ok) setNote("Marked running late"); return r; })}
                className="rounded-xl bg-amber-500 px-3 py-3 text-[14px] font-semibold text-white shadow-sm disabled:opacity-50">
                ⏱ Running late
              </button>
              <button disabled={pending} onClick={() => act(async () => { const r = await actionLogNoShow(appt.id); if (r.ok) setStatus("CANCELLED_FAMILY"); return r; })}
                className="rounded-xl bg-seed-100 px-3 py-3 text-[13.5px] font-semibold text-seed-700 disabled:opacity-50">
                Family no-show
              </button>
              <button disabled={pending} onClick={() => act(async () => { const r = await actionCancelVisit(appt.id); if (r.ok) setStatus("CANCELLED_PROVIDER"); return r; })}
                className="rounded-xl bg-seed-100 px-3 py-3 text-[13.5px] font-semibold text-seed-700 disabled:opacity-50">
                I can't make it
              </button>
            </div>
          )}

          {/* Notes */}
          {appt.notes && (
            <div className="rounded-xl bg-seed-50 px-3 py-2 text-[13px] text-seed-700">{appt.notes}</div>
          )}

          {/* Ranked matches when cancelled */}
          {(status === "CANCELLED_PROVIDER" || status === "OPEN_SLOT") && matches.length > 0 && (
            <div>
              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-melon-700">
                Families you can reach this month
              </div>
              <ul className="space-y-1.5">
                {matches.slice(0, 4).map((m, i) => (
                  <li key={m.childId} className="flex items-center justify-between rounded-xl bg-melon-50/60 px-3 py-2 text-[13px]">
                    <div>
                      <span className="font-semibold text-seed-900">{i + 1}. {m.childName}</span>
                      <div className="text-[12px] text-seed-500">
                        {m.missedSessionHours > 0 ? `${m.missedSessionHours.toFixed(1)}h available` : m.reason}
                        {" · "}🚗 {m.driveMinutes} min
                      </div>
                    </div>
                    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${m.withinAvailability ? "bg-rind-50 text-rind-700" : "bg-amber-50 text-amber-700"}`}>
                      {m.withinAvailability ? "In window" : "Confirm"}
                    </span>
                  </li>
                ))}
              </ul>
              <a href="/marketplace" className="mt-2 block text-center text-[13px] font-medium text-melon-700 hover:text-melon-800">
                Open full Recovery Queue →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
