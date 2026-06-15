"use client";
import { useState, useTransition } from "react";

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function buildSmsPreview(slot: { providerName: string; startsAt: string }) {
  const d = new Date(slot.startsAt);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const firstName = slot.providerName.split(" ")[0];
  return `A make-up appointment is available with ${firstName} on ${weekday} ${month} ${ordinal(d.getDate())} at ${time}.\nTap to claim: wmln.app/o/ab12cd34\n\nSent by TinyWatermelon.com`;
}

interface FirstSlot {
  providerName: string;
  startsAt: string;
  discipline: string;
}

export function SendAllOffersButton({
  slotIds,
  firstSlot,
}: {
  slotIds: string[];
  firstSlot?: FirstSlot;
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const previewText = firstSlot ? buildSmsPreview(firstSlot) : "";

  async function sendAll() {
    start(async () => {
      for (const id of slotIds) {
        await fetch("/api/v1/offers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slotId: id }),
        }).catch(() => {});
      }
      setDone(true);
      setShowPreview(false);
    });
  }

  if (done) {
    return (
      <button disabled className="rounded-xl bg-melon-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lift opacity-50">
        ✓ Offers sent to all families
      </button>
    );
  }

  return (
    <>
      {/* Preview modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-seed-900/50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-lift"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-seed-100 px-5 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-melon-600">
                Confirm — Smart Family Offer
              </div>
              <div className="mt-0.5 text-[16px] font-semibold text-seed-900">
                Send offers for {slotIds.length} slot{slotIds.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* SMS preview */}
            {firstSlot && (
              <>
                <div className="px-5 pt-4 pb-1 text-[12px] font-semibold uppercase tracking-wider text-seed-400">
                  Example SMS (first slot)
                </div>
                <div className="bg-white border-b border-rind-200 px-4 py-3 text-center mx-5 rounded-t-xl">
                  <div className="text-[12px] font-semibold uppercase tracking-wider text-seed-400">SMS Preview</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-white">+1 (619) 555-0114</div>
                </div>
                <div className="bg-seed-100 p-4 mx-5 rounded-b-xl min-h-[120px]">
                  <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-rind-500 px-3.5 py-2.5 text-[13px] leading-snug text-white whitespace-pre-line">
                    {previewText}
                  </div>
                  <div className="mt-1 text-right text-[11px] text-seed-400">Delivered</div>
                </div>
                <div className="px-5 py-2 text-center text-[11px] text-seed-500">
                  🔒 No provider discipline, child name, or clinical detail in the text
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-2 border-t border-seed-100 px-5 py-4">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 rounded-xl border border-seed-200 py-2.5 text-[13px] font-semibold text-seed-700 hover:bg-seed-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={sendAll}
                disabled={pending}
                className="flex-1 rounded-xl bg-melon-500 py-2.5 text-[13px] font-semibold text-white shadow-lift hover:bg-melon-600 disabled:opacity-50 transition"
              >
                {pending ? "Sending…" : `Confirm — Send to all families`}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setShowPreview(true)}
        disabled={slotIds.length === 0}
        className="rounded-xl bg-melon-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-lift transition hover:bg-melon-600 disabled:opacity-50"
      >
        Send Smart Offer for All {slotIds.length} Slots
      </button>
    </>
  );
}
