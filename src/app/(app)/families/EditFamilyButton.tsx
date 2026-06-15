"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_BILLING_TYPES } from "@/lib/types";
import { updateFamily } from "./actions";

const DISCIPLINES = ["OT", "PT", "SLP", "MT", "ABA"] as const;
type D = (typeof DISCIPLINES)[number];

const inputCls = "w-full rounded-lg border border-seed-200 bg-white px-3 py-2 text-[15px] outline-none focus:border-melon-400 focus:ring-2 focus:ring-melon-100";

function calcAge(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function toDateInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().split("T")[0];
}

interface FamilyProp {
  id: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail?: string | null;
  secondaryContactName?: string | null;
  secondaryContactPhone?: string | null;
  homeAddress?: string | null;
  homeCity?: string | null;
  homeZip?: string | null;
  homeNeighborhood?: string | null;
  preferredLocation?: string | null;
  travelNotes?: string | null;
  billingTypeId?: string | null;
  rateOverrides: Array<{ discipline: string; ratePerHour: number }>;
  children: Array<{
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: Date | string | null;
    ageYears: number;
    authorizedServices: Array<{ discipline: string; monthlyHours: number }>;
  }>;
}

export function EditFamilyButton({ family }: { family: FamilyProp }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const firstChild = family.children[0];
  const initAuth: Partial<Record<D, number>> = {};
  if (firstChild) {
    for (const svc of firstChild.authorizedServices) {
      if (DISCIPLINES.includes(svc.discipline as D)) {
        initAuth[svc.discipline as D] = svc.monthlyHours;
      }
    }
  }
  const initRateOverrides: Partial<Record<D, number>> = {};
  for (const r of family.rateOverrides) {
    if (DISCIPLINES.includes(r.discipline as D)) {
      initRateOverrides[r.discipline as D] = r.ratePerHour;
    }
  }

  const [parentName, setParentName] = useState(family.primaryContactName);
  const [parentPhone, setParentPhone] = useState(family.primaryContactPhone);
  const [parentEmail, setParentEmail] = useState(family.primaryContactEmail ?? "");
  const [secondaryContactName, setSecondaryContactName] = useState(family.secondaryContactName ?? "");
  const [secondaryContactPhone, setSecondaryContactPhone] = useState(family.secondaryContactPhone ?? "");
  const [homeStreet, setHomeStreet] = useState(family.homeAddress ?? "");
  const [homeCity, setHomeCity] = useState(family.homeCity ?? "San Diego");
  const [homeZip, setHomeZip] = useState(family.homeZip ?? "");
  const [homeNeighborhood, setHomeNeighborhood] = useState(family.homeNeighborhood ?? "");
  const [preferredLocation, setPreferredLocation] = useState<"school" | "home" | "other">(
    (family.preferredLocation as "school" | "home" | "other") ?? "school"
  );
  const [travelNotes, setTravelNotes] = useState(family.travelNotes ?? "");
  const [billingTypeId, setBillingTypeId] = useState<string>(
    family.billingTypeId ?? DEFAULT_BILLING_TYPES[0].id
  );
  const [travelRatePerMile, setTravelRatePerMile] = useState(
    (family as any).travelRatePerMile ? String((family as any).travelRatePerMile) : ""
  );
  const [rateOverrides, setRateOverrides] = useState<Partial<Record<D, number>>>(initRateOverrides);
  const [auth, setAuth] = useState<Partial<Record<D, number>>>(initAuth);

  // Child fields
  const [firstName, setFirstName] = useState(firstChild?.firstName ?? "");
  const [lastName, setLastName] = useState(firstChild?.lastName ?? "");
  const [birthDate, setBirthDate] = useState(toDateInputValue(firstChild?.birthDate));

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function close() {
    setOpen(false);
    setStep(1);
    setError(null);
  }

  function submit() {
    start(async () => {
      try {
        await updateFamily(family.id, {
          primaryContactName: parentName,
          primaryContactPhone: parentPhone,
          primaryContactEmail: parentEmail || undefined,
          secondaryContactName: secondaryContactName || undefined,
          secondaryContactPhone: secondaryContactPhone || undefined,
          homeAddress: homeStreet || undefined,
          homeCity: homeCity || undefined,
          homeZip: homeZip || undefined,
          homeNeighborhood: homeNeighborhood || undefined,
          preferredLocation: preferredLocation || undefined,
          travelNotes: travelNotes || undefined,
          billingTypeId: billingTypeId || undefined,
          travelRatePerMile: travelRatePerMile ? parseFloat(travelRatePerMile) : null,
          rateOverrides: Object.entries(rateOverrides)
            .filter(([, v]) => v && v > 0)
            .map(([discipline, ratePerHour]) => ({ discipline, ratePerHour: ratePerHour! })),
          child: firstChild
            ? {
                id: firstChild.id,
                firstName,
                lastName,
                birthDate: birthDate || undefined,
              }
            : undefined,
          authorizedServices: Object.entries(auth)
            .filter(([, v]) => v && v > 0)
            .map(([d, h]) => ({ discipline: d, monthlyHours: h as number })),
        });
        close();
        router.refresh();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to save changes");
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Edit family"
        className="rounded-lg p-1.5 text-seed-400 hover:bg-seed-100 hover:text-seed-700 transition"
      >
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1464 1.14645L3.71972 8.57318C3.52372 8.76917 3.52372 9.08573 3.71972 9.28172L5.71828 11.2803C5.91427 11.4763 6.23083 11.4763 6.42682 11.2803L13.8536 3.85355C14.0488 3.65829 14.0488 3.34171 13.8536 3.14645L11.8536 1.14645ZM4.42682 9.92818L2.87818 8.37954L10.3536 0.904143L11.9023 2.45279L4.42682 9.92818ZM2.14645 9.35355L1 14L5.64645 12.8536L2.14645 9.35355Z" fill="currentColor"/>
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-seed-900/40 p-4"
          onClick={close}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-lift"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-seed-100 px-6 py-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-melon-700">Edit family · Step {step} of 3</div>
                <h2 className="mt-0.5 text-[18px] font-semibold text-seed-900">
                  {step === 1 ? "Family info" : step === 2 ? "Location" : "Services & billing"}
                </h2>
              </div>
              <button onClick={close} className="rounded-lg p-1.5 text-seed-500 hover:bg-seed-100">✕</button>
            </div>
            {/* Progress */}
            <div className="flex h-1 bg-seed-100">
              {[1,2,3].map(s => <div key={s} className={`flex-1 ${s <= step ? "bg-melon-500" : ""}`} />)}
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-5 space-y-4">
              {step === 1 && (
                <>
                  {firstChild && (
                    <div className="grid grid-cols-2 gap-3">
                      <F label="Child's first name"><input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus /></F>
                      <F label="Child's last name"><input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} /></F>
                    </div>
                  )}
                  {firstChild && (
                    <F label="Date of birth">
                      <input type="date" className={inputCls} value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                      {birthDate && <div className="mt-1 text-[12px] text-seed-500">Age: {calcAge(birthDate)} years old</div>}
                    </F>
                  )}
                  <F label="Parent / Guardian #1"><input className={inputCls} value={parentName} onChange={e => setParentName(e.target.value)} /></F>
                  <F label="Phone"><input className={inputCls} value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="(619) 555-0000" /></F>
                  <F label="Email (optional)"><input type="email" className={inputCls} value={parentEmail} onChange={e => setParentEmail(e.target.value)} /></F>
                  <div className="mt-3 border-t border-seed-100 pt-3">
                    <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-seed-400">
                      Parent / Guardian #2 (optional)
                    </div>
                    <div className="space-y-3">
                      <F label="Name"><input className={inputCls} value={secondaryContactName} onChange={e => setSecondaryContactName(e.target.value)} placeholder="Second parent or guardian" /></F>
                      <F label="Phone"><input className={inputCls} value={secondaryContactPhone} onChange={e => setSecondaryContactPhone(e.target.value)} placeholder="(619) 555-0000" /></F>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <F label="Preferred visit location">
                    <div className="grid grid-cols-3 gap-2">
                      {(["school","home","other"] as const).map(loc => (
                        <button key={loc} type="button" onClick={() => setPreferredLocation(loc)}
                          className={`rounded-lg py-2 text-[14px] font-semibold capitalize transition ${preferredLocation === loc ? "bg-seed-900 text-white" : "bg-seed-100 text-seed-700 hover:bg-seed-200"}`}>
                          {loc}
                        </button>
                      ))}
                    </div>
                  </F>
                  {(preferredLocation === "home" || preferredLocation === "other") && (
                    <>
                      <F label="Street address"><input className={inputCls} value={homeStreet} onChange={e => setHomeStreet(e.target.value)} placeholder="1234 Ocean Blvd" /></F>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2"><F label="City"><input className={inputCls} value={homeCity} onChange={e => setHomeCity(e.target.value)} /></F></div>
                        <F label="ZIP"><input className={inputCls} value={homeZip} onChange={e => setHomeZip(e.target.value)} placeholder="92109" /></F>
                      </div>
                      <F label="Neighborhood (optional)"><input className={inputCls} value={homeNeighborhood} onChange={e => setHomeNeighborhood(e.target.value)} placeholder="Pacific Beach" /></F>
                    </>
                  )}
                  <F label="Travel notes (optional)"><input className={inputCls} value={travelNotes} onChange={e => setTravelNotes(e.target.value)} placeholder="Gate code, parking, dog in yard…" /></F>
                </>
              )}

              {step === 3 && (
                <>
                  <F label="Monthly service capacity">
                    <div className="space-y-1.5">
                      {DISCIPLINES.map(d => {
                        const on = auth[d] !== undefined;
                        return (
                          <div key={d}>
                            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${on ? "border-melon-200 bg-melon-50/40" : "border-seed-200 bg-seed-50"}`}>
                              <label className="flex flex-1 items-center gap-2 text-[14px] cursor-pointer">
                                <input type="checkbox" checked={on} onChange={() => setAuth(prev => { const n = {...prev}; if (n[d]) delete n[d]; else n[d] = 5; return n; })} className="h-4 w-4 rounded text-melon-600" />
                                <span className="font-semibold text-seed-800">{d}</span>
                              </label>
                              {on && (
                                <div className="flex items-center gap-1.5">
                                  <input type="number" min={1} max={40} value={auth[d] ?? 0}
                                    onChange={e => setAuth(prev => ({ ...prev, [d]: +e.target.value }))}
                                    className="w-14 rounded-lg border border-seed-200 bg-white px-2 py-1 text-right text-[14px] tabular-nums focus:border-melon-400 focus:outline-none" />
                                  <span className="text-[13px] text-seed-500">hrs/mo</span>
                                </div>
                              )}
                            </div>
                            {on && (
                              <div className="flex items-center gap-2 mt-1 ml-6">
                                <span className="text-[12px] text-seed-500">Rate override:</span>
                                <span className="text-seed-600">$</span>
                                <input type="number" min={0} step={5} placeholder="—"
                                  value={rateOverrides[d] ?? ""}
                                  onChange={e => setRateOverrides(prev => ({ ...prev, [d]: e.target.value ? +e.target.value : undefined }))}
                                  className="w-20 rounded-lg border border-seed-200 bg-white px-2 py-1 text-right text-[13px] tabular-nums focus:border-melon-400 focus:outline-none" />
                                <span className="text-[12px] text-seed-500">/hr (optional)</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </F>
                  <F label="Billing type">
                    <div className="space-y-1.5">
                      {DEFAULT_BILLING_TYPES.map(bt => (
                        <label key={bt.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${billingTypeId === bt.id ? "border-melon-300 bg-melon-50" : "border-seed-200 bg-seed-50 hover:bg-white"}`}>
                          <input type="radio" name="bt-edit" value={bt.id} checked={billingTypeId === bt.id} onChange={() => setBillingTypeId(bt.id)} className="h-4 w-4 text-melon-600" />
                          <span className="text-[14.5px] font-medium text-seed-900">{bt.label}</span>
                          {bt.includesTravel && <span className="ml-auto text-[11px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">+ travel</span>}
                        </label>
                      ))}
                    </div>
                  </F>
                  {DEFAULT_BILLING_TYPES.find(bt => bt.id === billingTypeId)?.includesTravel && (
                    <F label="Travel rate" hint="Applied when provider travels to this family">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] text-seed-600">$</span>
                        <input type="number" min={0} step={0.05} value={travelRatePerMile}
                          onChange={e => setTravelRatePerMile(e.target.value)}
                          placeholder="0.67" className={inputCls} />
                        <span className="text-[13px] text-seed-500">/mile</span>
                      </div>
                    </F>
                  )}
                  {error && (
                    <div className="rounded-xl bg-melon-50 px-3 py-2 text-[13px] text-melon-700">
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 border-t border-seed-100 bg-seed-50 px-6 py-4">
              {step > 1
                ? <button onClick={() => setStep(s => (s - 1) as 1|2|3)} className="rounded-xl px-3 py-2 text-[14px] font-medium text-seed-700 hover:bg-seed-100">← Back</button>
                : <button onClick={close} className="rounded-xl px-3 py-2 text-[14px] font-medium text-seed-600">Cancel</button>}
              {step < 3
                ? <button onClick={() => setStep(s => (s + 1) as 2|3)} disabled={step === 1 && (!parentName.trim() || !parentPhone.trim())}
                    className="rounded-xl bg-melon-500 px-4 py-2 text-[14px] font-semibold text-white hover:bg-melon-600 disabled:opacity-50">Next →</button>
                : <button onClick={submit} disabled={pending}
                    className="rounded-xl bg-melon-500 px-4 py-2 text-[14px] font-semibold text-white hover:bg-melon-600 disabled:opacity-50">
                    {pending ? "Saving…" : "Save changes"}
                  </button>}
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
