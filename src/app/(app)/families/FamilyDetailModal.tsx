"use client";

import { useState } from "react";
import { EditFamilyButton } from "./EditFamilyButton";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
function fmtMin(m: number) {
  const h = Math.floor(m / 60), mm = m % 60;
  const p = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}${mm ? `:${String(mm).padStart(2,"0")}` : ""} ${p}`;
}

interface FamilyDetail {
  id: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string | null;
  secondaryContactName: string | null;
  secondaryContactPhone: string | null;
  homeAddress: string | null;
  homeCity: string | null;
  homeZip: string | null;
  homeNeighborhood: string | null;
  preferredLocation: string | null;
  travelNotes: string | null;
  billingTypeId: string | null;
  travelRatePerMile: number | null;
  billingType: { label: string; includesTravel: boolean } | null;
  rateOverrides: Array<{ discipline: string; ratePerHour: number }>;
  children: Array<{
    id: string;
    firstName: string;
    lastName: string;
    ageYears: number;
    birthDate: Date | null;
    authorizedServices: Array<{ discipline: string; monthlyHours: number }>;
    parentAvailability?: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>;
  }>;
}

export function FamilyDetailModal({
  family,
  isAdmin,
}: {
  family: FamilyDetail;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-[16px] font-semibold text-seed-900 hover:text-melon-600 transition text-left"
      >
        {family.primaryContactName}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-seed-900/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-seed-100 px-6 py-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-melon-700">Family Detail</div>
                <h2 className="mt-0.5 text-[18px] font-semibold text-seed-900">{family.primaryContactName}</h2>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <EditFamilyButton
                    family={{
                      id: family.id,
                      primaryContactName: family.primaryContactName,
                      primaryContactPhone: family.primaryContactPhone,
                      primaryContactEmail: family.primaryContactEmail,
                      homeAddress: family.homeAddress,
                      homeCity: family.homeCity,
                      homeZip: family.homeZip,
                      homeNeighborhood: family.homeNeighborhood,
                      preferredLocation: family.preferredLocation,
                      travelNotes: family.travelNotes,
                      billingTypeId: family.billingTypeId,
                      rateOverrides: family.rateOverrides,
                      children: family.children.map((c) => ({
                        id: c.id,
                        firstName: c.firstName,
                        lastName: c.lastName,
                        birthDate: c.birthDate,
                        ageYears: c.ageYears,
                        authorizedServices: c.authorizedServices,
                      })),
                    }}
                  />
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-seed-500 hover:bg-seed-100"
                >✕</button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto px-6 py-5 space-y-4">
              {/* Contact */}
              <Section title="Contact">
                <Row label="Phone" value={family.primaryContactPhone} />
                {family.primaryContactEmail && <Row label="Email" value={family.primaryContactEmail} />}
                {family.secondaryContactName && <Row label="Guardian #2" value={`${family.secondaryContactName}${family.secondaryContactPhone ? ` · ${family.secondaryContactPhone}` : ''}`} />}
              </Section>

              {/* Location */}
              <Section title="Location">
                <Row label="Preferred" value={family.preferredLocation ?? "School"} />
                {family.homeAddress && (
                  <Row label="Address" value={[family.homeAddress, family.homeCity, family.homeZip].filter(Boolean).join(", ")} />
                )}
                {family.homeNeighborhood && <Row label="Neighborhood" value={family.homeNeighborhood} />}
                {family.travelNotes && <Row label="Travel notes" value={family.travelNotes} accent="amber" />}
              </Section>

              {/* Billing */}
              <Section title="Billing">
                {family.billingType && (
                  <Row
                    label="Type"
                    value={`${family.billingType.label}${family.billingType.includesTravel ? " (includes travel)" : ""}`}
                  />
                )}
                {family.travelRatePerMile && (
                  <Row label="Travel rate" value={`$${family.travelRatePerMile}/mile`} />
                )}
                {family.rateOverrides.length > 0 && (
                  <Row
                    label="Rate overrides"
                    value={family.rateOverrides.map((r) => `${r.discipline}: $${r.ratePerHour}/hr`).join(" · ")}
                  />
                )}
              </Section>

              {/* Children */}
              {family.children.map((child) => (
                <Section key={child.id} title={`${child.firstName} ${child.lastName}`}>
                  <Row label="Age" value={`${child.ageYears} years old`} />
                  {child.birthDate && (
                    <Row
                      label="Date of birth"
                      value={new Date(child.birthDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    />
                  )}
                  {child.authorizedServices.length > 0 && (
                    <Row
                      label="Authorized services"
                      value={child.authorizedServices.map((s) => `${s.discipline}: ${s.monthlyHours}h/mo`).join(" · ")}
                    />
                  )}
                  {child.parentAvailability && child.parentAvailability.length > 0 && (
                    <Row
                      label="Availability"
                      value={child.parentAvailability
                        
                        .map((w) => `${DAYS[w.dayOfWeek]} ${fmtMin(w.startMinutes)}–${fmtMin(w.endMinutes)}`)
                        .join(" · ")}
                    />
                  )}
                </Section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-seed-400">{title}</div>
      <div className="rounded-xl bg-seed-50 divide-y divide-seed-100 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: "amber" }) {
  return (
    <div className="flex gap-3 px-3 py-2.5">
      <span className="w-28 shrink-0 text-[12px] font-semibold uppercase tracking-wider text-seed-400">{label}</span>
      <span className={`text-[13.5px] ${accent === "amber" ? "text-amber-700" : "text-seed-800"}`}>{value}</span>
    </div>
  );
}
