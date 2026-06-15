"use client";

// HIPAA §164.312(a)(2)(iii) — Automatic logoff after inactivity.
// Signs the user out after 30 minutes of NO activity (mouse/keyboard/touch/scroll).
// Active users are never interrupted — only idle sessions time out.

import { useEffect, useRef, useState, useCallback } from "react";

const IDLE_MS = 28 * 60 * 1000;   // 28 min of inactivity → show warning
const WARN_MS =  2 * 60 * 1000;   // 2 min warning before signout (30 min total)
const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click", "pointerdown"];

export function IdleTimeout({
  signOutAction,
}: {
  signOutAction: () => Promise<void>;
}) {
  const [warn, setWarn] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const idleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  // Use a ref for signOutAction so it never causes reset() to be recreated
  const signOutRef = useRef(signOutAction);
  useEffect(() => { signOutRef.current = signOutAction; }, [signOutAction]);

  const clearTimers = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (countRef.current)  clearInterval(countRef.current);
  }, []);

  // reset() has a stable identity — never changes, so event listeners are never torn down
  const reset = useCallback(() => {
    clearTimers();
    setWarn(false);
    setSecondsLeft(120);
    idleTimer.current = setTimeout(() => {
      setWarn(true);
      setSecondsLeft(Math.floor(WARN_MS / 1000));
      countRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(countRef.current!);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
      warnTimer.current = setTimeout(() => {
        signOutRef.current();
      }, WARN_MS);
    }, IDLE_MS);
  }, [clearTimers]); // signOutAction removed from deps — use ref instead

  useEffect(() => {
    reset();
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimers();
      EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, []); // Empty deps — only runs on mount/unmount, never re-adds listeners

  if (!warn) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-seed-900/60">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lift text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-3xl">
          ⏱
        </div>
        <h2 className="font-display text-[22px] font-medium text-seed-900">
          Still there?
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-seed-600">
          For security, you'll be signed out automatically in{" "}
          <span className="font-semibold text-amber-700">
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>{" "}
          due to inactivity.
        </p>
        <button
          onClick={reset}
          className="mt-6 w-full rounded-xl bg-melon-500 px-4 py-3 text-[15px] font-semibold text-white shadow-lift transition hover:bg-melon-600"
        >
          Keep me signed in
        </button>
        <button
          onClick={() => signOutAction()}
          className="mt-2 w-full rounded-xl px-4 py-2.5 text-[14px] font-medium text-seed-500 hover:text-seed-700"
        >
          Sign out now
        </button>
      </div>
    </div>
  );
}
