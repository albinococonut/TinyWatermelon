"use client";

import { useState, useTransition } from "react";
import { completeEnrollment } from "./actions";

export function MfaEnrollForm({
  pendingSecretEncrypted,
}: {
  pendingSecretEncrypted: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    start(async () => {
      setError(null);
      const result = await completeEnrollment(formData);
      if (!result.ok) setError(result.error ?? "Verification failed.");
      // On success, server action redirects — we won't reach here.
    });
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="pendingSecretEncrypted" value={pendingSecretEncrypted} />
      <label className="block">
        <span className="text-[12.5px] font-semibold uppercase tracking-wider text-seed-500">
          6-digit code from your authenticator
        </span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000000"
          className="mt-1 w-full rounded-xl border border-seed-200 bg-seed-50 px-3.5 py-3 text-center text-[22px] font-semibold tracking-[0.3em] tabular-nums text-seed-900 placeholder:text-seed-300 focus:border-melon-400 focus:outline-none focus:ring-2 focus:ring-melon-200"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="bg-melon-button w-full rounded-xl px-4 py-3 text-[15px] font-semibold text-white shadow-lift disabled:opacity-60"
      >
        {pending ? "Verifying…" : "Verify and enable MFA"}
      </button>
      {error && (
        <p className="rounded-lg bg-melon-50 px-3 py-2 text-center text-[13px] text-melon-700">
          {error}
        </p>
      )}
    </form>
  );
}
