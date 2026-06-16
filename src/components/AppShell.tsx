"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

const adminNav = [
  { href: "/marketplace", label: "Recovery Queue", icon: MarketIcon, live: true },
  { href: "/schedule", label: "Schedule", icon: CalendarIcon },
  { href: "/providers", label: "Providers", icon: TeamIcon },
  { href: "/families", label: "Families & Children", icon: ChildIcon },
  { href: "/messages", label: "Family Messages", icon: ChatIcon },
  { href: "/me", label: "Provider Day View", icon: PhoneIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
] as const;

// 4 tabs — fits perfectly in a mobile tab bar
const providerNav = [
  { href: "/me",              label: "Schedule",   icon: CalendarIcon },
  { href: "/me?tab=families", label: "Families",   icon: ChildIcon },
  { href: "/me?tab=slots",    label: "Open Slots", icon: OpenSlotsIcon },
  { href: "/messages",        label: "Messages",   icon: ChatIcon },
] as const;

function AppShellInner({
  children,
  orgName,
  role,
  providerId,
  signOutAction,
  messagesUnread,
}: {
  children: React.ReactNode;
  orgName?: string;
  role?: string;
  providerId?: string | null;
  signOutAction?: () => Promise<void>;
  messagesUnread?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [open, setOpen] = useState(false);

  const isProvider = role === "PROVIDER";
  const nav = isProvider
    ? providerNav
    : adminNav.filter(item => item.href !== "/me" || role === "OWNER" || !!providerId);

  function isActive(href: string): boolean {
    const [hPath, hQuery] = href.split("?");
    const hTab = hQuery ? new URLSearchParams(hQuery).get("tab") : null;
    if (hTab) return pathname === hPath && currentTab === hTab;
    if (hPath === "/me" && !hTab) return pathname === hPath && !currentTab;
    return pathname === hPath || (hPath !== "/marketplace" && pathname.startsWith(hPath + "/"));
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">

      {/* Mobile top bar — hidden for providers (bottom tab bar handles all navigation) */}
      {!isProvider && (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-seed-200 bg-white px-4 py-3 md:hidden">
          <Link href="/marketplace" className="inline-flex" aria-label="Home">
            <img src="/logo-long.png" alt="tiny watermelon" className="h-8 w-auto" />
          </Link>
          <button
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            className="rounded-lg p-2 text-seed-700 hover:bg-seed-100"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {open ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </header>
      )}

      {/* ── Sidebar (admin mobile + all desktop) ───────────────────────────── */}
      <aside className={`
        ${isProvider ? "hidden md:flex md:flex-col" : (open ? "flex flex-col" : "hidden md:flex md:flex-col")}
        border-b border-seed-200 bg-white
        md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r
      `}>
        <div className="hidden shrink-0 flex-col items-start gap-1 px-6 py-5 md:flex">
          <img src="/logo-stacked.png" alt="tiny watermelon" className="h-28 w-auto" />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4 md:pb-0">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                  active ? "bg-melon-50 text-melon-700" : "text-seed-700 hover:bg-seed-100"
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-melon-500" : "text-seed-500"}`} />
                <span className="flex-1">{item.label}</span>
                {"live" in item && item.live && (
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-melon-600">
                    <span className="live-dot h-1.5 w-1.5 rounded-full bg-melon-500" /> Live
                  </span>
                )}
                {item.href === "/messages" && (messagesUnread ?? 0) > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-melon-500 px-1.5 text-[10px] font-bold text-white">
                    {(messagesUnread ?? 0) > 9 ? "9+" : messagesUnread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-seed-100 px-6 py-4 md:block">
          {orgName && (
            <div className="mb-2 text-[13px] font-semibold text-seed-700 truncate">{orgName}</div>
          )}
          {signOutAction ? (
            <form action={signOutAction}>
              <button type="submit" className="text-[13px] font-medium text-seed-500 hover:text-seed-700">
                Sign out
              </button>
            </form>
          ) : null}
          <div className="mt-3 rounded-lg bg-seed-50 px-2.5 py-2 text-[11px] text-seed-500">
            <span className="font-semibold text-rind-600">HIPAA-compliant</span> · audit logged
          </div>
          <div className="mt-2 flex gap-3 text-[11px] text-seed-400">
            <Link href="/privacy" className="hover:text-seed-600">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-seed-600">Terms</Link>
          </div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────────
           On mobile, provider content needs bottom padding so the tab bar
           doesn't overlap the last card.                                     */}
      <main className={`min-w-0 flex-1 ${isProvider ? "pb-16 md:pb-0" : ""}`}>
        {children}
      </main>

      {/* ── Provider bottom tab bar (mobile only) ──────────────────────────── */}
      {isProvider && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-seed-200 bg-white md:hidden"
             style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {providerNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isMessages = item.href === "/messages";
            const hasUnread = isMessages && (messagesUnread ?? 0) > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 transition ${
                  active ? "text-melon-600" : "text-seed-400"
                }`}
              >
                <div className="relative">
                  <Icon className={`h-6 w-6 ${active ? "text-melon-500" : "text-seed-400"}`} />
                  {/* Red dot indicator for unread messages */}
                  {hasUnread && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold leading-none ${active ? "text-melon-600" : "text-seed-400"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export function AppShell(props: React.ComponentProps<typeof AppShellInner>) {
  return (
    <Suspense fallback={<AppShellInner {...props} />}>
      <AppShellInner {...props} />
    </Suspense>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────
function MarketIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 6h18l-1.5 9h-15z" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </svg>
  );
}
function OpenSlotsIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
      <path d="M12 13v4M10 15h4" strokeLinecap="round" />
    </svg>
  );
}
function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}
function TeamIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="9" cy="9" r="3" />
      <circle cx="17" cy="11" r="2.2" />
      <path d="M3 19c.8-3 3.2-4.5 6-4.5s5.2 1.5 6 4.5" strokeLinecap="round" />
      <path d="M15 19c.5-2 2-3 4-3" strokeLinecap="round" />
    </svg>
  );
}
function ChildIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 20c1-4 4-6 7-6s6 2 7 6" strokeLinecap="round" />
    </svg>
  );
}
function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H6.5A2.5 2.5 0 0 1 4 14.5v-8z" strokeLinejoin="round" />
    </svg>
  );
}
function PhoneIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18h2" strokeLinecap="round" />
    </svg>
  );
}
function GearIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" strokeLinecap="round" />
    </svg>
  );
}
