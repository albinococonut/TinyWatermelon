"use client";

import { useState, useTransition } from "react";
import { actionSendOffer, actionConfirmForFamily } from "./actions";

export function OfferButton({
  slotId,
  eligibleCount,
  isLive,
  onFilled,
}: {
  slotId: string;
  eligibleCount: number;
  isLive: boolean;
  onFilled?: () => void;
}) {
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [count, setCount] = useState<number | null>(null);
  const [pending, start] = useTransition();

  if (isLive) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[14px] font-semibold text-amber-800 ring-1 ring-amber-100">
        <span className="live-dot h-1.5 w-1.5 rounded-full bg-amber-500" />
        Offer live · awaiting first confirmation
      </div>
    );
  }
  if (state === "sent") {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-rind-50 px-3 py-2.5 text-[14px] font-semibold text-rind-700">
        ✓ Offer sent to {count} families · awaiting first confirmation
      </div>
    );
  }

  return (
    <button
      disabled={pending || eligibleCount === 0}
      onClick={() =>
        start(async () => {
          const r = await actionSendOffer(slotId);
          if (r.ok) { setState("sent"); setCount(r.recipientCount ?? 0); onFilled?.(); }
          else setState("error");
        })
      }
      className="bg-melon-button flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[14px] font-semibold text-white shadow-lift transition disabled:opacity-50"
    >
      <BlastIcon />
      {pending ? "Sending offer…" : `Send Smart Family Offer · ${eligibleCount} eligible`}
    </button>
  );
}

export function ConfirmButton({
  slotId,
  childId,
  childName,
  onFilled,
}: {
  slotId: string;
  childId: string;
  childName: string;
  onFilled?: () => void;
}) {
  const [state, setState] = useState<"idle" | "done">("idle");
  const [pending, start] = useTransition();

  if (state === "done") {
    return (
      <div className="rounded-lg bg-rind-50 px-2 py-1.5 text-[13px] font-semibold text-rind-700">
        ✓ Confirmed for {childName}
      </div>
    );
  }

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await actionConfirmForFamily(slotId, childId);
          if (r.ok) { setState("done"); onFilled?.(); }
        })
      }
      className="rounded-lg bg-melon-500 px-3 py-2 text-[13px] font-semibold text-white shadow-card transition hover:bg-melon-600 disabled:opacity-50"
    >
      {pending ? "Confirming…" : "Confirm opening"}
    </button>
  );
}

function BlastIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-8-7 18-3-8-8-2z" />
    </svg>
  );
}
