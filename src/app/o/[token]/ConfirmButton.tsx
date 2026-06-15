"use client";

import { useState, useTransition } from "react";

export function PortalConfirmButton({
  offerId,
  slotId,
  childId,
  childName,
}: {
  offerId: string | null;
  slotId?: string;
  childId: string;
  childName: string;
}) {
  const [state, setState] = useState<"idle" | "confirmed" | "taken" | "error">("idle");
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      if (offerId) {
        // Claim via offer (Smart Family Offer flow)
        const res = await fetch(`/api/v1/offers/${offerId}/claim`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ childId }),
        });
        if (res.ok) setState("confirmed");
        else if (res.status === 409) setState("taken");
        else setState("error");
      } else if (slotId) {
        // Direct confirm (no blast was sent — coordinator-triggered portal link)
        const res = await fetch(`/api/v1/slots/${slotId}/confirm`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ childId }),
        });
        if (res.ok) setState("confirmed");
        else setState("error");
      }
    });
  }

  if (state === "confirmed") {
    return (
      <div className="rounded-2xl bg-rind-50 px-5 py-5 text-center ring-1 ring-rind-100">
        <div className="text-2xl">✅</div>
        <div className="mt-2 font-display text-[22px] font-medium text-rind-800">
          You're confirmed!
        </div>
        <p className="mt-1 text-[13px] text-rind-700">
          We'll send {childName} a reminder 1 hour before the visit.
        </p>
      </div>
    );
  }

  if (state === "taken") {
    return (
      <div className="rounded-xl bg-seed-100 px-4 py-3 text-center text-[14px] text-seed-700">
        Sorry — another family just confirmed this opening. We'll send the next one right away.
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-2">
        <div className="rounded-xl bg-melon-50 px-4 py-3 text-center text-[13px] text-melon-700">
          Something went wrong. Please try again or call us.
        </div>
        <button onClick={confirm} className="bg-melon-button w-full rounded-xl px-4 py-3 text-[15px] font-semibold text-white shadow-lift">
          Try again
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={confirm}
      disabled={pending}
      className="bg-melon-button w-full rounded-xl px-4 py-4 text-[16px] font-semibold text-white shadow-lift transition disabled:opacity-60"
    >
      {pending ? "Confirming…" : `Yes, confirm for ${childName}`}
    </button>
  );
}
