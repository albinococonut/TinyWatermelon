"use client";

// Owns the full Provider Day View screen so scroll events from the appointment
// list can collapse the top header — saving ~100px of vertical space on mobile.

import { useState, useCallback } from "react";
import Link from "next/link";
import type { GridAppt } from "@/components/WeekGrid";
import { ProviderDayList } from "./ProviderDayList";
import { SlotCard } from "@/app/(app)/marketplace/SlotCard";

interface WeekDay {
  dateStr: string; label: string; dayNum: number; isToday: boolean; fullLabel: string;
}
interface ChildInfo {
  id: string; firstName: string; lastName: string;
  family: {
    primaryContactName: string; primaryContactPhone: string;
    secondaryContactName: string | null; secondaryContactPhone: string | null;
    homeNeighborhood: string | null;
  } | null;
  authorizedServices: { discipline: string; monthlyHours: number }[];
}
interface OpenSlot {
  id: string; startsAt: string; endsAt: string; discipline: string; providerName: string;
}

interface Props {
  providerName: string;
  credentials: string | null;
  discipline: string;
  todayCount: number;
  doneCount: number;
  weekTotal: number;
  weekOffset: number;
  tab: string;
  weekDays: WeekDay[];
  byDate: Record<string, GridAppt[]>;
  prevHref: string;
  nextHref: string;
  initialDayIndex?: number;
  myChildren: ChildInfo[];
  siblingsByChildId: Record<string, { name: string; discipline: string }[]>;
  openSlots: OpenSlot[];
  onCancel: (id: string, reason: string) => Promise<{ openSlotId: string | null }>;
  onComplete: (id: string) => Promise<void>;
  onUncomplete: (id: string) => Promise<void>;
}

export function ProviderPageClient({
  providerName, credentials, discipline,
  todayCount, doneCount, weekTotal,
  weekOffset, tab,
  weekDays, byDate, prevHref, nextHref, initialDayIndex,
  myChildren, siblingsByChildId, openSlots,
  onCancel, onComplete, onUncomplete,
}: Props) {
  // true once user has scrolled the appointment list down a bit
  const [compact, setCompact] = useState(false);

  const handleScrollChange = useCallback((scrolled: boolean) => {
    setCompact(scrolled);
  }, []);

  return (
    <div className="flex h-dvh flex-col md:h-screen overflow-hidden">

      {/* ── Collapsing provider header ─────────────────────────────────────
           On desktop this is always fully visible.
           On mobile it collapses when the appointment list scrolls.          */}
      <div
        className={`shrink-0 border-b border-seed-200 bg-white overflow-hidden transition-all duration-200 ease-in-out
          md:max-h-24 md:opacity-100
          ${compact ? "max-h-0 border-b-0 opacity-0 py-0" : "max-h-24 opacity-100"}`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-melon-600">Provider Day View</div>
            <div className="text-[16px] font-semibold text-seed-900 truncate">
              {providerName}
              <span className="ml-2 text-[13px] font-normal text-seed-400">{credentials} · {discipline}</span>
            </div>
          </div>
          <div className="flex gap-2 text-center shrink-0">
            <div className="rounded-xl bg-seed-50 px-2.5 py-1.5 md:px-3 md:py-2">
              <div className="text-[9px] font-bold uppercase text-seed-500">Today</div>
              <div className="text-[17px] font-bold tabular-nums text-seed-900">{todayCount}</div>
            </div>
            <div className="rounded-xl bg-rind-50 px-2.5 py-1.5 md:px-3 md:py-2">
              <div className="text-[9px] font-bold uppercase text-rind-600">Done</div>
              <div className="text-[17px] font-bold tabular-nums text-rind-700">{doneCount}</div>
            </div>
            <div className="rounded-xl bg-seed-50 px-2.5 py-1.5 md:px-3 md:py-2">
              <div className="text-[9px] font-bold uppercase text-seed-500">Week</div>
              <div className="text-[17px] font-bold tabular-nums text-seed-900">{weekTotal}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab nav ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex border-b border-seed-200 bg-white px-4">
        {[
          { id: "schedule", label: "Schedule" },
          { id: "families", label: "My Families" },
          { id: "slots", label: "Open Slots" },
        ].map(t => (
          <Link
            key={t.id}
            href={`/me?week=${weekOffset}&tab=${t.id}`}
            className={`mr-4 py-2.5 text-[14px] font-semibold border-b-2 transition ${
              tab === t.id
                ? "border-melon-500 text-melon-700"
                : "border-transparent text-seed-500 hover:text-seed-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────── */}
      {tab === "schedule" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <ProviderDayList
            weekDays={weekDays}
            byDate={byDate}
            prevHref={prevHref}
            nextHref={nextHref}
            initialDayIndex={initialDayIndex}
            onCancel={onCancel}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
            onScrollChange={handleScrollChange}
          />
        </div>
      )}

      {tab === "families" && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
          {myChildren.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-[14px] text-seed-400">
              No children scheduled this month.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[13px] text-seed-500 mb-2">
                <span className="font-semibold text-seed-800">{myChildren.length}</span> children this month
              </div>
              {myChildren.map(child => (
                <div key={child.id} className="rounded-xl border border-seed-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold text-seed-900">{child.firstName} {child.lastName}</div>
                      {child.family && (
                        <>
                          <div className="mt-1 text-[13px] text-seed-700">
                            <span className="font-medium">Parent:</span> {child.family.primaryContactName}
                            {child.family.primaryContactPhone ? ` · ${child.family.primaryContactPhone}` : ""}
                          </div>
                          {child.family.secondaryContactName && (
                            <div className="text-[13px] text-seed-700">
                              <span className="font-medium">Guardian 2:</span> {child.family.secondaryContactName}
                              {child.family.secondaryContactPhone ? ` · ${child.family.secondaryContactPhone}` : ""}
                            </div>
                          )}
                          {child.family.homeNeighborhood && (
                            <div className="text-[12px] text-seed-400 mt-0.5">📍 {child.family.homeNeighborhood}</div>
                          )}
                        </>
                      )}
                      {(siblingsByChildId[child.id]?.length ?? 0) > 0 && (
                        <div className="mt-1 text-[12px] text-seed-500">
                          <span className="font-medium">Also sees:</span>{" "}
                          {siblingsByChildId[child.id].map(p => `${p.name} (${p.discipline})`).join(" · ")}
                        </div>
                      )}
                    </div>
                    {child.authorizedServices.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {child.authorizedServices.map(svc => (
                          <span key={svc.discipline}
                            className="rounded-full bg-seed-100 px-2 py-0.5 text-[11px] font-semibold text-seed-700">
                            {svc.discipline} · {svc.monthlyHours}h/mo
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "slots" && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 md:px-6">
          <div className="mb-4 text-[12px] font-semibold uppercase tracking-wider text-seed-500">
            Your open slots — find replacement families for each
          </div>
          {openSlots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-seed-200 bg-white p-10 text-center text-[15px] text-seed-400">
              No open slots — all your time is filled.
            </div>
          ) : (
            <div className="space-y-4">
              {openSlots.map(slot => (
                <SlotCard
                  key={slot.id}
                  slot={{ id: slot.id, startsAt: slot.startsAt, endsAt: slot.endsAt, discipline: slot.discipline, providerName: slot.providerName }}
                  isLive={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
