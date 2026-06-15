"use client";

import { useState, useTransition } from "react";
import { actionMarkUnavailable } from "./actions";

export function AvailabilityToggle({ providerId }: { providerId: string }) {
  const [step, setStep] = useState<"idle" | "confirm" | "done">("idle");
  const [opened, setOpened] = useState(0);
  const [pending, start] = useTransition();

  if (step === "done") {
    return (
      <div className="rounded-2xl border border-rind-100 bg-rind-50 px-4 py-4 text-[14px] text-rind-800">
        ✓ Marked out for today. {opened} visit{opened === 1 ? "" : "s"} sent to the Recovery Queue.
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <div className="text-[14px] font-semibold text-amber-900">Mark yourself out today?</div>
        <p className="mt-1 text-[13px] text-amber-800">
          Your remaining visits will be sent to the Recovery Queue so families can still get their sessions.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={() => setStep("idle")} disabled={pending}
            className="rounded-xl bg-white px-3 py-2.5 text-[13px] font-semibold text-seed-700 ring-1 ring-seed-200">
            Cancel
          </button>
          <button
            onClick={() => start(async () => {
              const r = await actionMarkUnavailable(providerId);
              if (r.ok) { setOpened(r.openedCount ?? 0); setStep("done"); }
            })}
            disabled={pending}
            className="rounded-xl bg-melon-500 px-3 py-2.5 text-[13px] font-semibold text-white shadow-sm">
            {pending ? "Working…" : "Yes, mark out"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setStep("confirm")}
      className="block w-full rounded-2xl border border-dashed border-seed-300 bg-white px-4 py-4 text-left text-[14px] font-medium text-seed-700 transition active:bg-seed-50"
    >
      🚫 Mark unavailable today
      <div className="mt-0.5 text-[12px] font-normal text-seed-500">
        Sends remaining visits to the Recovery Queue.
      </div>
    </button>
  );
}
