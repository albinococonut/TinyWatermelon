"use client";
import { useState } from "react";
import { SlotCard } from "./SlotCard";

interface SlotInfo {
  id: string;
  startsAt: string;
  endsAt: string;
  discipline: string;
  providerName: string;
}

export function IgnorableSlotList({
  slots,
  liveSlotIds,
  dbFilledSlots = [],
}: {
  slots: SlotInfo[];
  liveSlotIds: string[];
  dbFilledSlots?: SlotInfo[];
}) {
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [clientFilled, setClientFilled] = useState<Set<string>>(new Set());

  function markFilled(slotId: string) {
    setClientFilled(prev => new Set([...prev, slotId]));
  }

  const dbFilledIds = new Set(dbFilledSlots.map(s => s.id));
  const active = slots.filter((s) => !ignored.has(s.id) && !clientFilled.has(s.id) && !dbFilledIds.has(s.id));
  const ignoredList = slots.filter((s) => ignored.has(s.id));
  // Combine DB-persisted filled slots + client-filled ones (deduplicated)
  const clientFilledSlots = slots.filter(s => clientFilled.has(s.id) && !dbFilledIds.has(s.id));
  const allFilledSlots = [...dbFilledSlots, ...clientFilledSlots];

  return (
    <div>
      <div className="space-y-4">
        {active.map((slot) => (
          <div key={slot.id}>
            <SlotCard
              slot={slot}
              isLive={liveSlotIds.includes(slot.id)}
              onFilled={markFilled}
            />
            <div className="flex justify-end mt-1 mb-1">
              <button
                onClick={() => setIgnored((prev) => new Set([...prev, slot.id]))}
                className="text-[11px] font-medium text-seed-400 hover:text-seed-600 transition px-2 py-0.5"
              >
                ✕ ignore this slot
              </button>
            </div>
          </div>
        ))}
      </div>

      {ignoredList.length > 0 && (
        <div className="mt-6 border-t border-seed-200 pt-4">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-seed-400">
            Ignored slots ({ignoredList.length})
          </div>
          <div className="space-y-2">
            {ignoredList.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-3 rounded-xl border border-seed-200 bg-seed-50 px-4 py-3 opacity-50"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-[14px] line-through text-seed-600">
                    {slot.providerName} · {slot.discipline}
                  </span>
                  <span className="ml-2 text-[12px] text-seed-400">
                    {new Date(slot.startsAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(slot.startsAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setIgnored((prev) => {
                      const n = new Set(prev);
                      n.delete(slot.id);
                      return n;
                    })
                  }
                  className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[12px] font-medium text-melon-600 hover:bg-melon-50 transition ring-1 ring-seed-200"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {allFilledSlots.length > 0 && (
        <div className="mt-6 border-t border-seed-200 pt-4">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-seed-400">
            Filled this week ({allFilledSlots.length})
          </div>
          {allFilledSlots.map(slot => (
            <div key={slot.id} className="flex items-center gap-3 rounded-xl border border-rind-200 bg-rind-50 px-4 py-3 mb-2">
              <span className="rounded-md bg-rind-500 px-2 py-0.5 text-[11px] font-bold text-white">FILLED</span>
              <span className="flex-1 line-through text-[14px] text-seed-500">
                {slot.providerName} · {slot.discipline} ·{" "}
                {new Date(slot.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                at{" "}
                {new Date(slot.startsAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
