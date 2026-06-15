"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProvider, linkProviderToUser, unlinkProviderFromUser } from "./actions";

const DISCIPLINES = ["OT", "PT", "SLP", "MT", "ABA"] as const;
const DISC_LABEL: Record<string, string> = {
  OT: "Occupational Therapy", PT: "Physical Therapy",
  SLP: "Speech-Language", MT: "Music Therapy", ABA: "ABA Therapy",
};

const inputCls = "w-full rounded-lg border border-seed-200 bg-white px-3 py-2 text-[15px] outline-none focus:border-melon-400 focus:ring-2 focus:ring-melon-100";

interface Provider {
  id: string;
  name: string;
  credentials: string | null;
  title: string | null;
  discipline: string;
  bilingual: boolean;
  weeklyTargetHours: number;
  bufferMinutes: number;
  startAddress: string | null;
  billingRatePerHour?: number | null;
  avatarHue: number | null;
}

function initials(name: string) {
  return name.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
}
function avatarStyle(hue: number | null) {
  const h = hue ?? 0;
  return {
    background: `linear-gradient(135deg, hsl(${h} 70% 88%) 0%, hsl(${(h + 25) % 360} 65% 75%) 100%)`,
    color: `hsl(${h} 35% 28%)`,
  };
}

interface LinkedUser { id: string; name: string | null; email: string; }
interface AvailableUser { userId: string; name: string | null; email: string; }

export function EditProviderButton({ provider, isAdmin, linkedUser, availableUsers }: {
  provider: Provider;
  isAdmin: boolean;
  linkedUser?: LinkedUser | null;
  availableUsers?: AvailableUser[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(provider.name);
  const [credentials, setCredentials] = useState(provider.credentials ?? "");
  const [title, setTitle] = useState(provider.title ?? "");
  const [discipline, setDiscipline] = useState(provider.discipline);
  const [bilingual, setBilingual] = useState(provider.bilingual);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(provider.weeklyTargetHours);
  const [bufferMinutes, setBufferMinutes] = useState(provider.bufferMinutes);
  const [startAddress, setStartAddress] = useState(provider.startAddress ?? "");
  const [billingRate, setBillingRate] = useState(provider.billingRatePerHour ? String(provider.billingRatePerHour) : "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function reset() {
    setName(provider.name);
    setCredentials(provider.credentials ?? "");
    setTitle(provider.title ?? "");
    setDiscipline(provider.discipline);
    setBilingual(provider.bilingual);
    setWeeklyTargetHours(provider.weeklyTargetHours);
    setBufferMinutes(provider.bufferMinutes);
    setStartAddress(provider.startAddress ?? "");
    setBillingRate(provider.billingRatePerHour ? String(provider.billingRatePerHour) : "");
    setError(null);
  }

  function save() {
    start(async () => {
      try {
        await updateProvider(provider.id, {
          name, credentials, title, discipline, bilingual,
          weeklyTargetHours, bufferMinutes, startAddress,
          billingRatePerHour: billingRate ? parseFloat(billingRate) : null,
        });
        setOpen(false);
        router.refresh();
      } catch {
        setError("Failed to save. Please try again.");
      }
    });
  }

  const DISC_COLOR: Record<string, string> = {
    OT: "bg-amber-50 text-amber-800", PT: "bg-violet-50 text-violet-800",
    SLP: "bg-sky-50 text-sky-800", MT: "bg-emerald-50 text-emerald-800", ABA: "bg-orange-50 text-orange-800",
  };

  return (
    <>
      {/* View / Edit button */}
      <button
        onClick={() => { reset(); setOpen(true); }}
        className="mt-3 block w-full rounded-xl bg-seed-50 py-2 text-center text-[13.5px] font-medium text-seed-700 hover:bg-seed-100 transition"
      >
        {isAdmin ? "View / Edit →" : "View →"}
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-seed-900/40 p-4"
          onClick={() => { setOpen(false); reset(); }}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-lift"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center gap-4 border-b border-seed-100 px-6 py-4">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold"
                style={avatarStyle(provider.avatarHue)}>
                {initials(name || provider.name)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-melon-700">
                  {isAdmin ? "Provider Profile" : "View Provider"}
                </div>
                <h2 className="mt-0.5 text-[18px] font-semibold text-seed-900 truncate">{name || provider.name}</h2>
              </div>
              <button onClick={() => { setOpen(false); reset(); }}
                className="rounded-lg p-1.5 text-seed-500 hover:bg-seed-100">✕</button>
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-5 space-y-4">
              {/* Read-only view for non-admins */}
              {!isAdmin ? (
                <div className="space-y-3">
                  <Row label="Name" value={provider.name} />
                  <Row label="Credentials" value={provider.credentials ?? "—"} />
                  <Row label="Title" value={provider.title ?? "—"} />
                  <Row label="Discipline" value={
                    <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${DISC_COLOR[provider.discipline] ?? "bg-seed-100 text-seed-700"}`}>
                      {DISC_LABEL[provider.discipline] ?? provider.discipline}
                    </span>
                  } />
                  <Row label="Bilingual" value={provider.bilingual ? "Yes (EN/ES)" : "No"} />
                  <Row label="Weekly target" value={`${provider.weeklyTargetHours}h/week`} />
                  <Row label="Buffer time" value={`${provider.bufferMinutes} min between visits`} />
                  <Row label="Start address" value={provider.startAddress ?? "School base (org default)"} />
                  {provider.billingRatePerHour && (
                    <Row label="Billing rate" value={`$${provider.billingRatePerHour}/hr`} />
                  )}
                </div>
              ) : (
                <>
                  <F label="Full name">
                    <input className={inputCls} value={name} onChange={e => setName(e.target.value)} autoFocus />
                  </F>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Credentials">
                      <input className={inputCls} value={credentials} onChange={e => setCredentials(e.target.value)} placeholder="MS, OTR/L" />
                    </F>
                    <F label="Title">
                      <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Occupational Therapist" />
                    </F>
                  </div>
                  <F label="Discipline">
                    <select className={inputCls} value={discipline} onChange={e => setDiscipline(e.target.value)}>
                      {DISCIPLINES.map(d => (
                        <option key={d} value={d}>{DISC_LABEL[d]}</option>
                      ))}
                    </select>
                  </F>
                  <label className="flex items-center gap-2.5 text-[14px] cursor-pointer">
                    <input type="checkbox" checked={bilingual} onChange={e => setBilingual(e.target.checked)}
                      className="h-4 w-4 rounded border-seed-300 text-melon-600" />
                    <span className="font-medium text-seed-800">Bilingual (EN/ES)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <F label="Weekly target hours">
                      <input type="number" min={1} max={60} className={inputCls} value={weeklyTargetHours}
                        onChange={e => setWeeklyTargetHours(+e.target.value)} />
                    </F>
                    <F label="Buffer between visits (min)">
                      <input type="number" min={0} max={60} className={inputCls} value={bufferMinutes}
                        onChange={e => setBufferMinutes(+e.target.value)} />
                    </F>
                  </div>
                  <F label="Start address" hint="Leave blank to use org base address">
                    <input className={inputCls} value={startAddress} onChange={e => setStartAddress(e.target.value)}
                      placeholder="4761 Cass Street, San Diego, CA 92109" />
                  </F>
                  <F label="Billing rate ($/hr)" hint="Overrides the org-level rate for this provider's visits. Leave blank to use default.">
                    <div className="flex items-center gap-2">
                      <span className="text-[16px] text-seed-600">$</span>
                      <input type="number" min={0} step={5} className={inputCls} value={billingRate}
                        onChange={e => setBillingRate(e.target.value)}
                        placeholder={`Org default`} />
                      <span className="text-[13px] text-seed-500">/hr</span>
                    </div>
                  </F>
                  {error && (
                    <div className="rounded-xl bg-melon-50 px-4 py-3 text-[13.5px] text-melon-700">{error}</div>
                  )}

                  {/* User account linking — admin only */}
                  {isAdmin && (
                    <div className="rounded-xl border border-seed-200 p-4 space-y-2">
                      <div className="text-[12px] font-semibold uppercase tracking-wider text-seed-400">
                        Linked user account
                      </div>
                      {linkedUser ? (
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[14px] font-semibold text-seed-900">{linkedUser.name ?? linkedUser.email}</div>
                            <div className="text-[12px] text-seed-500">{linkedUser.email} · can use Provider Day View</div>
                          </div>
                          <button
                            onClick={() => start(async () => { await unlinkProviderFromUser(provider.id); router.refresh(); })}
                            disabled={pending}
                            className="rounded-lg border border-melon-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-melon-600 hover:bg-melon-50 transition disabled:opacity-50"
                          >
                            Unlink
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[13px] text-seed-500">
                            No user account linked. Link an admin/owner so they can access Provider Day View.
                          </div>
                          {(availableUsers?.length ?? 0) > 0 && (
                            <select
                              className="w-full rounded-lg border border-seed-200 bg-white px-3 py-2 text-[14px] focus:border-melon-400 focus:outline-none"
                              defaultValue=""
                              onChange={e => {
                                const uid = e.target.value;
                                if (uid) start(async () => { await linkProviderToUser(provider.id, uid); router.refresh(); });
                              }}
                            >
                              <option value="" disabled>Select a user to link…</option>
                              {availableUsers!.map(u => (
                                <option key={u.userId} value={u.userId}>
                                  {u.name ?? u.email} ({u.email})
                                </option>
                              ))}
                            </select>
                          )}
                          {(availableUsers?.length ?? 0) === 0 && (
                            <div className="text-[12px] text-seed-400">No unlinked admin users available.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-seed-100 bg-seed-50 px-6 py-4">
              <button onClick={() => { setOpen(false); reset(); }}
                className="rounded-xl px-3 py-2 text-[14px] font-medium text-seed-600 hover:bg-seed-100">
                {isAdmin ? "Cancel" : "Close"}
              </button>
              {isAdmin && (
                <button onClick={save} disabled={pending || !name.trim()}
                  className="rounded-xl bg-melon-500 px-5 py-2 text-[14px] font-semibold text-white hover:bg-melon-600 disabled:opacity-50 transition">
                  {pending ? "Saving…" : "Save changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function F({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-seed-500">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11.5px] text-seed-400">{hint}</div>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-seed-50 px-4 py-3">
      <span className="w-28 shrink-0 text-[12px] font-semibold uppercase tracking-wider text-seed-400">{label}</span>
      <span className="text-[14px] text-seed-900">{value}</span>
    </div>
  );
}
