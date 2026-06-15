"use client";
import { useState, useTransition } from "react";
import { sendReply } from "./actions";

export function ReplyForm({ threadId, isResolved }: { threadId: string; isResolved: boolean }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);

  function send() {
    if (!body.trim()) return;
    start(async () => {
      await sendReply(threadId, body.trim());
      setBody("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    });
  }

  return (
    <div className="border-t border-seed-100 bg-seed-50/50 px-5 py-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Type a reply… (Enter to send)"
          className="flex-1 rounded-xl border border-seed-200 bg-white px-3 py-2 text-[14px] outline-none focus:border-melon-400 focus:ring-2 focus:ring-melon-100"
          disabled={pending}
        />
        <button
          onClick={send}
          disabled={pending || !body.trim()}
          className="rounded-xl bg-seed-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-seed-800 transition disabled:opacity-50"
        >
          {pending ? "…" : sent ? "Sent ✓" : "Send"}
        </button>
      </div>
      <div className="mt-1 text-[11px] text-seed-400">
        🔒 Keep replies PHI-free — no child names, diagnoses, or clinical details
      </div>
    </div>
  );
}
