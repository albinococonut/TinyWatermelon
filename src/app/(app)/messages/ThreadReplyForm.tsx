"use client";
import { useState, useTransition } from "react";
import { sendReply } from "./actions";

// PHI patterns to detect
const PHI_PATTERNS = [
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // phone number
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // email
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // date of birth
  /\bdiagnos\w*/i, // diagnosis
  /\bmedication\w*/i,
  /\bprescri\w*/i,
  /\bsocial security\b/i,
  /\bSSN\b/,
  /\bDOB\b/i,
  /\bdate of birth\b/i,
  /\b(?:autism|ASD|ADHD|cerebral palsy|down syndrome|epilepsy)\b/i, // specific diagnoses
];

function detectPHI(text: string): string | null {
  if (PHI_PATTERNS[0].test(text)) return "Phone numbers";
  if (PHI_PATTERNS[1].test(text)) return "Email addresses";
  if (PHI_PATTERNS[2].test(text)) return "Dates of birth";
  for (let i = 3; i < PHI_PATTERNS.length; i++) {
    if (PHI_PATTERNS[i].test(text)) return "Potential medical/clinical information";
  }
  return null;
}

export function ThreadReplyForm({ threadId }: { threadId: string }) {
  const [body, setBody] = useState("");
  const [phiWarning, setPhiWarning] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  function handleChange(val: string) {
    setBody(val);
    const phi = detectPHI(val);
    setPhiWarning(phi);
    if (!phi) setConfirmed(false);
  }

  function handleSend() {
    if (!body.trim()) return;
    if (phiWarning && !confirmed) {
      return;
    }
    start(async () => {
      await sendReply(threadId, body.trim());
      setBody("");
      setPhiWarning(null);
      setConfirmed(false);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    });
  }

  return (
    <div className="border-t border-seed-200 bg-white px-4 py-3 space-y-2">
      {phiWarning && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <span className="text-amber-600 text-[16px] shrink-0">&#9888;</span>
            <div>
              <div className="text-[13px] font-semibold text-amber-800">Possible PHI detected: {phiWarning}</div>
              <div className="text-[12px] text-amber-700 mt-0.5">
                HIPAA requires PHI-free outbound texts. Remove sensitive information before sending.
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-300 text-amber-600"
                />
                <span className="text-[12px] text-amber-700 font-medium">I confirm this message contains no PHI</span>
              </label>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type a message… (PHI-free)"
          className="flex-1 rounded-2xl border border-seed-200 bg-seed-50 px-4 py-2.5 text-[14px] outline-none focus:border-melon-400 focus:bg-white"
          disabled={pending}
        />
        <button
          onClick={handleSend}
          disabled={pending || !body.trim() || (!!phiWarning && !confirmed)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-melon-500 text-white hover:bg-melon-600 disabled:opacity-40 transition shrink-0"
        >
          {pending ? "…" : sent ? "✓" : "↑"}
        </button>
      </div>
    </div>
  );
}
