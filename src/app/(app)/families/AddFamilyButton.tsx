"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_BILLING_TYPES } from "@/lib/types";

const DISCIPLINES = ["OT", "PT", "SLP", "MT", "ABA"] as const;
type D = (typeof DISCIPLINES)[number];
const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_IDS = [1, 2, 3, 4, 5, 6] as const;
const TIME_OPTS = [
  { v: 8 * 60, l: "8:00 AM" }, { v: 9 * 60, l: "9:00 AM" }, { v: 10 * 60, l: "10:00 AM" },
  { v: 11 * 60, l: "11:00 AM" }, { v: 12 * 60, l: "12:00 PM" }, { v: 13 * 60, l: "1:00 PM" },
  { v: 14 * 60, l: "2:00 PM" }, { v: 15 * 60, l: "3:00 PM" }, { v: 16 * 60, l: "4:00 PM" },
  { v: 17 * 60, l: "5:00 PM" }, { v: 18 * 60, l: "6:00 PM" },
];

const inputCls = "w-full rounded-lg border border-seed-200 bg-white px-3 py-2 text-[15px] outline-none focus:border-melon-400 focus:ring-2 focus:ring-melon-100";

function calcAge(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export function AddFamilyButton({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [homeStreet, setHomeStreet] = useState("");
  const [homeCity, setHomeCity] = useState("San Diego");
  const [homeZip, setHomeZip] = useState("");
  const [homeNeighborhood, setHomeNeighborhood] = useState("");
  const [preferredLocation, setPreferredLocation] = useState<"school" | "home" | "other">("school");
  const [travelNotes, setTravelNotes] = useState("");
  const [avail, setAvail] = useState<Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>>([
    { dayOfWeek: 1, startMinutes: 14 * 60, endMinutes: 18 * 60 },
    { dayOfWeek: 2, startMinutes: 14 * 60, endMinutes: 18 * 60 },
    { dayOfWeek: 3, startMinutes: 14 * 60, endMinutes: 18 * 60 },
    { dayOfWeek: 4, startMinutes: 14 * 60, endMinutes: 18 * 60 },
  ]);
  const [auth, setAuth] = useState<Partial<Record<D, number>>>({ OT: 5 });
  const [billingTypeId, setBillingTypeId] = useState<string>(DEFAULT_BILLING_TYPES[0].id);
  const [travelRatePerMile, setTravelRatePerMile] = useState("");
  const [rateOverrides, setRateOverrides] = useState<Partial<Record<D, number>>>({});
  const [secondaryContactName, setSecondaryContactName] = useState("");
  const [secondaryContactPhone, setSecondaryContactPhone] = useState("");
  const [primaryContactOptIn, setPrimaryContactOptIn] = useState(true);
  const [secondaryContactOptIn, setSecondaryContactOptIn] = useState(true);
  const [pending, start] = useTransition();
  const router = useRouter();

  function reset() {
    setStep(1); setFirstName(""); setLastName(""); setBirthDate("");
    setParentName(""); setParentPhone(""); setParentEmail("");
    setHomeStreet(""); setHomeCity("San Diego"); setHomeZip("");
    setHomeNeighborhood(""); setPreferredLocation("school"); setTravelNotes("");
    setAvail([
      { dayOfWeek: 1, startMinutes: 14 * 60, endMinutes: 18 * 60 },
      { dayOfWeek: 2, startMinutes: 14 * 60, endMinutes: 18 * 60 },
      { dayOfWeek: 3, startMinutes: 14 * 60, endMinutes: 18 * 60 },
      { dayOfWeek: 4, startMinutes: 14 * 60, endMinutes: 18 * 60 },
    ]);
    setAuth({ OT: 5 }); setBillingTypeId(DEFAULT_BILLING_TYPES[0].id); setTravelRatePerMile(""); setRateOverrides({});
    setSecondaryContactName(""); setSecondaryContactPhone("");
    setPrimaryContactOptIn(true); setSecondaryContactOptIn(true);
  }

  function toggleDay(id: number) {
    setAvail(prev => prev.some(w => w.dayOfWeek === id)
      ? prev.filter(w => w.dayOfWeek !== id)
      : [...prev, { dayOfWeek: id, startMinutes: 14 * 60, endMinutes: 18 * 60 }].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
  }

  function submit() {
    start(async () => {
      const res = await fetch("/api/v1/families", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          primaryContactName: parentName,
          primaryContactPhone: parentPhone,
          primaryContactEmail: parentEmail || undefined,
          homeAddress: homeStreet || undefined,
          homeCity: homeCity || undefined,
          homeZip: homeZip || undefined,
          homeNeighborhood: homeNeighborhood || undefined,
          preferredLocation,
          travelNotes: travelNotes || undefined,
          billingTypeId,
          travelRatePerMile: travelRatePerMile ? parseFloat(travelRatePerMile) : undefined,
          rateOverrides: Object.entries(rateOverrides)
            .filter(([, v]) => v && v > 0)
            .map(([discipline, ratePerHour]) => ({ discipline, ratePerHour })),
          secondaryContactName: secondaryContactName || undefined,
          secondaryContactPhone: secondaryContactPhone || undefined,
          primaryContactOptIn,
          secondaryContactOptIn,
          child: { firstName, lastName, birthDate: birthDate || undefined },
          authorizedServices: Object.entries(auth)
            .filter(([, v]) => v && v > 0)
            .map(([d, h]) => ({ discipline: d, monthlyHours: h as number })),
          parentAvailability: avail,
        }),
      });
      if (res.ok) { setOpen(false); reset(); router.refresh(); }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-melon-500 px-3.5 py-2 text-[14px] font-semibold text-white shadow-card hover:bg-melon-600 transition">
        + Add family
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-seed-900/40 p-4"
      onClick={() => { setOpen(false); reset(); }}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-lift"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-seed-100 px-6 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-melon-700">New family · Step {step} of 3</div>
            <h2 className="mt-0.5 text-[18px] font-semibold text-seed-900">
              {step === 1 ? "Family info" : step === 2 ? "Location & availability" : "Services & billing"}
            </h2>
          </div>
          <button onClick={() => { setOpen(false); reset(); }} className="rounded-lg p-1.5 text-seed-500 hover:bg-seed-100">✕</button>
        </div>
        {/* Progress */}
        <div className="flex h-1 bg-seed-100">
          {[1,2,3].map(s => <div key={s} className={`flex-1 ${s <= step ? "bg-melon-500" : ""}`} />)}
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-5 space-y-4">
          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <F label="Child's first name"><input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus /></F>
                <F label="Child's last name"><input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} /></F>
              </div>
              <F label="Date of birth">
                <input type="date" className={inputCls} value={birthDate} onChange={e => setBirthDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                {birthDate && <div className="mt-1 text-[12px] text-seed-500">Age: {calcAge(birthDate)} years old</div>}
              </F>
              <F label="Parent / Guardian #1"><input className={inputCls} value={parentName} onChange={e => setParentName(e.target.value)} /></F>
              <F label="Phone">
                <input className={inputCls} value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="(619) 555-0000" />
                <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[13px] text-seed-600">
                  <input type="checkbox" checked={primaryContactOptIn} onChange={e => setPrimaryContactOptIn(e.target.checked)} className="h-4 w-4 rounded text-melon-600" />
                  Text {firstName.trim() || "this parent"} for open slot offers
                </label>
              </F>
              <F label="Email (optional)"><input type="email" className={inputCls} value={parentEmail} onChange={e => setParentEmail(e.target.value)} /></F>
              <div className="mt-3 border-t border-seed-100 pt-3">
                <div className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-seed-400">
                  Parent / Guardian #2 (optional)
                </div>
                <div className="space-y-3">
                  <F label="Name"><input className={inputCls} value={secondaryContactName} onChange={e => setSecondaryContactName(e.target.value)} placeholder="Second parent or guardian" /></F>
                  <F label="Phone">
                    <input className={inputCls} value={secondaryContactPhone} onChange={e => setSecondaryContactPhone(e.target.value)} placeholder="(619) 555-0000" />
                    {secondaryContactPhone && (
                      <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[13px] text-seed-600">
                        <input type="checkbox" checked={secondaryContactOptIn} onChange={e => setSecondaryContactOptIn(e.target.checked)} className="h-4 w-4 rounded text-melon-600" />
                        Text {secondaryContactName.trim() || "this parent"} for open slot offers
                      </label>
                    )}
                  </F>
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
              <F label="Parent availability">
                <div className="space-y-1.5">
                  {DAY_IDS.map((id, i) => {
                    const win = avail.find(w => w.dayOfWeek === id);
                    return (
                      <div key={id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${win ? "border-melon-200 bg-melon-50/40" : "border-seed-200 bg-seed-50"}`}>
                        <label className="flex flex-1 items-center gap-2 text-[14px] cursor-pointer">
                          <input type="checkbox" checked={!!win} onChange={() => toggleDay(id)} className="h-4 w-4 rounded text-melon-600" />
                          <span className="font-semibold text-seed-800">{DAYS_SHORT[i]}</span>
                        </label>
                        {win && (
                          <div className="flex items-center gap-1.5 text-[13px]">
                            <select value={win.startMinutes}
                              onChange={e => setAvail(prev => prev.map(w => w.dayOfWeek === id ? { ...w, startMinutes: +e.target.value } : w))}
                              className="rounded-lg border border-seed-200 bg-white px-1.5 py-1 text-[13px] focus:border-melon-400 focus:outline-none">
                              {TIME_OPTS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                            </select>
                            <span className="text-seed-400">–</span>
                            <select value={win.endMinutes}
                              onChange={e => setAvail(prev => prev.map(w => w.dayOfWeek === id ? { ...w, endMinutes: +e.target.value } : w))}
                              className="rounded-lg border border-seed-200 bg-white px-1.5 py-1 text-[13px] focus:border-melon-400 focus:outline-none">
                              {TIME_OPTS.filter(t => t.v > win.startMinutes).map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </F>
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
                      <input type="radio" name="bt" value={bt.id} checked={billingTypeId === bt.id} onChange={() => setBillingTypeId(bt.id)} className="h-4 w-4 text-melon-600" />
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-seed-100 bg-seed-50 px-6 py-4">
          {step > 1
            ? <button onClick={() => setStep(s => (s - 1) as 1|2|3)} className="rounded-xl px-3 py-2 text-[14px] font-medium text-seed-700 hover:bg-seed-100">← Back</button>
            : <button onClick={() => { setOpen(false); reset(); }} className="rounded-xl px-3 py-2 text-[14px] font-medium text-seed-600">Cancel</button>}
          {step < 3
            ? <button onClick={() => setStep(s => (s + 1) as 2|3)} disabled={step === 1 && (!firstName.trim() || !lastName.trim())}
                className="rounded-xl bg-melon-500 px-4 py-2 text-[14px] font-semibold text-white hover:bg-melon-600 disabled:opacity-50">Next →</button>
            : <button onClick={submit} disabled={pending || !Object.values(auth).some(v => v && v > 0)}
                className="rounded-xl bg-melon-500 px-4 py-2 text-[14px] font-semibold text-white hover:bg-melon-600 disabled:opacity-50">
                {pending ? "Saving…" : "Add family"}
              </button>}
        </div>
      </div>
    </div>
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
