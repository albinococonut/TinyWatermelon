import { requireSession, providerScope } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { bucketBreakdownBatch, daysUntilMonthEnd } from "@/lib/buckets";
import { PageHeader } from "@/components/PageHeader";
import { AddFamilyButton } from "./AddFamilyButton";
import { EditFamilyButton } from "./EditFamilyButton";
import { FamilySearchInput } from "./FamilySearchInput";
import { FamilyBillingFilter } from "./FamilyBillingFilter";
import { FamilyDetailModal } from "./FamilyDetailModal";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function fmtMin(m: number) {
  const h = Math.floor(m / 60), mm = m % 60, p = h >= 12 ? "p" : "a";
  const h12 = ((h + 11) % 12) + 1;
  return mm === 0 ? `${h12}${p}` : `${h12}:${mm.toString().padStart(2, "0")}${p}`;
}
function fmtHrs(h: number) {
  const r = Math.round(h * 2) / 2;
  if (r === 0) return "0h";
  const w = Math.floor(r), half = r % 1 !== 0;
  if (!half) return `${w}h`;
  return w === 0 ? "½h" : `${w}½h`;
}

export default async function FamiliesPage({ searchParams }: { searchParams?: { q?: string; billing?: string } }) {
  const ctx = await requireSession();
  const h = headers();
  const today = new Date();
  const dEnd = daysUntilMonthEnd(today);
  const scope = providerScope(ctx);
  const q = searchParams?.q?.trim() ?? "";
  const billingFilter = searchParams?.billing ?? "";

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "READ",
    resourceType: "Family",
    ipAddress: h.get("x-forwarded-for") ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  });

  const billingTypes = await prisma.billingType.findMany({
    where: { organizationId: ctx.organizationId, active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true, color: true },
  });

  // PROVIDER: only families whose children have appointments with this provider
  let familyIds: string[] | null = null;
  if (scope.providerId) {
    const appts = await prisma.appointment.findMany({
      where: { organizationId: ctx.organizationId, providerId: scope.providerId, childId: { not: null } },
      select: { childId: true },
      distinct: ["childId"],
    });
    const childIds = appts.map(a => a.childId).filter(Boolean) as string[];
    const children = await prisma.child.findMany({
      where: { id: { in: childIds } },
      select: { familyId: true },
      distinct: ["familyId"],
    });
    familyIds = children.map(c => c.familyId);
  }

  const families = await prisma.family.findMany({
    where: {
      organizationId: ctx.organizationId,
      deletedAt: null,
      ...(familyIds !== null ? { id: { in: familyIds.length ? familyIds : ["__none__"] } } : {}),
      ...(billingFilter ? { billingTypeId: billingFilter } : {}),
      ...(q ? {
        OR: [
          { primaryContactName: { contains: q, mode: "insensitive" } },
          { homeNeighborhood: { contains: q, mode: "insensitive" } },
          { homeCity: { contains: q, mode: "insensitive" } },
          { children: { some: { firstName: { contains: q, mode: "insensitive" } } } },
          { children: { some: { lastName: { contains: q, mode: "insensitive" } } } },
          { children: { some: { authorizedServices: { some: { discipline: { contains: q, mode: "insensitive" } } } } } },
        ],
      } : {}),
    },
    include: {
      children: {
        where: { deletedAt: null },
        include: { authorizedServices: { where: { deletedAt: null } } },
      },
      billingType: { select: { label: true, defaultRatePerHour: true, includesTravel: true, color: true } },
      rateOverrides: true,
      // travelRatePerMile is a top-level field — fetched automatically
    },
    orderBy: { primaryContactName: "asc" },
  });

  // Bucket breakdowns per child
  // Batch all bucket breakdowns in 2 queries instead of N×M sequential queries
  const allChildIds = families.flatMap(f => f.children.map(c => c.id));
  const breakdownsByChild = await bucketBreakdownBatch(allChildIds, today);

  // Availability per first child of each family
  const availByChild: Record<string, Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>> = {};
  const firstChildIds = families.map(f => f.children[0]?.id).filter(Boolean) as string[];
  if (firstChildIds.length) {
    const rows = await prisma.parentAvailability.findMany({
      where: { childId: { in: firstChildIds } },
      orderBy: { dayOfWeek: "asc" },
    });
    for (const r of rows) {
      if (!availByChild[r.childId]) availByChild[r.childId] = [];
      availByChild[r.childId].push(r);
    }
  }

  const isAdmin = ["OWNER", "ADMIN"].includes(ctx.role);

  return (
    <div>
      <PageHeader
        eyebrow="Families & Children"
        title="Families & Children"
        subtitle={`${families.length} famil${families.length === 1 ? "y" : "ies"} · monthly capacity resets in ${dEnd} days`}
        right={isAdmin ? <AddFamilyButton organizationId={ctx.organizationId} /> : undefined}
      />

      <div className="px-5 py-6 md:px-10 md:py-8">
        <div className="mb-5">
          <FamilyBillingFilter billingTypes={billingTypes} />
          <FamilySearchInput defaultValue={q || undefined} />
          {q && (
            <div className="mt-2 text-[12px] text-seed-500">
              {families.length} of — filtered by &quot;{q}&quot;
            </div>
          )}
        </div>
        {families.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-seed-200 bg-white p-12 text-center text-[15px] text-seed-500">
            {q ? `No families match "${q}".` : `No families yet.${isAdmin ? " Use Add family to get started." : ""}`}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {families.map((fam) => {
              const allBds = fam.children.flatMap(c => breakdownsByChild[c.id] ?? []);
              const totalRemaining = allBds.reduce((s, b) => s + b.remaining, 0);
              const urgency = totalRemaining >= 2 && dEnd <= 7 ? "high"
                : totalRemaining >= 1 && dEnd <= 14 ? "med" : "low";

              return (
                <article key={fam.id} className={`rounded-2xl border bg-white p-4 shadow-card transition hover:shadow-md ${
                  urgency === "high" ? "border-melon-200 ring-1 ring-melon-100" : "border-seed-200"
                }`}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3>
                        <FamilyDetailModal
                          isAdmin={isAdmin}
                          family={{
                            id: fam.id,
                            primaryContactName: fam.primaryContactName,
                            primaryContactPhone: fam.primaryContactPhone,
                            primaryContactEmail: fam.primaryContactEmail,
                            secondaryContactName: (fam as any).secondaryContactName ?? null,
                            secondaryContactPhone: (fam as any).secondaryContactPhone ?? null,
                            homeAddress: fam.homeAddress,
                            homeCity: fam.homeCity,
                            homeZip: fam.homeZip,
                            homeNeighborhood: fam.homeNeighborhood,
                            preferredLocation: fam.preferredLocation,
                            travelNotes: fam.travelNotes,
                            billingTypeId: fam.billingTypeId,
                            travelRatePerMile: (fam as any).travelRatePerMile ?? null,
                            billingType: fam.billingType ? { label: fam.billingType.label, includesTravel: fam.billingType.includesTravel } : null,
                            rateOverrides: fam.rateOverrides,
                            children: fam.children.map(c => ({
                              id: c.id, firstName: c.firstName, lastName: c.lastName,
                              ageYears: c.ageYears, birthDate: (c as any).birthDate ?? null,
                              authorizedServices: c.authorizedServices,
                              parentAvailability: availByChild[c.id] ?? [],
                            })),
                          }}
                        />
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        {fam.billingType && (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-seed-600">
                            {fam.billingType.color && (
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: fam.billingType.color }} />
                            )}
                            {fam.billingType.label}{fam.billingType.includesTravel ? " + travel" : ""}
                          </span>
                        )}
                        {fam.primaryContactPhone && (
                          <span className="text-[12px] text-seed-400">{fam.primaryContactPhone}</span>
                        )}
                      </div>
                      {(fam as any).secondaryContactName && (
                        <div className="mt-0.5 text-[12px] text-seed-400">+{(fam as any).secondaryContactName}</div>
                      )}
                    </div>
                    {isAdmin && (
                      <EditFamilyButton
                        family={{
                          id: fam.id,
                          primaryContactName: fam.primaryContactName,
                          primaryContactPhone: fam.primaryContactPhone,
                          primaryContactEmail: fam.primaryContactEmail,
                          homeAddress: fam.homeAddress,
                          homeCity: fam.homeCity,
                          homeZip: fam.homeZip,
                          homeNeighborhood: fam.homeNeighborhood,
                          preferredLocation: fam.preferredLocation,
                          travelNotes: fam.travelNotes,
                          billingTypeId: fam.billingTypeId,
                          rateOverrides: fam.rateOverrides,
                          children: fam.children.map(c => ({
                            id: c.id,
                            firstName: c.firstName,
                            lastName: c.lastName,
                            birthDate: c.birthDate,
                            ageYears: c.ageYears,
                            authorizedServices: c.authorizedServices.map(s => ({
                              discipline: s.discipline,
                              monthlyHours: s.monthlyHours,
                            })),
                          })),
                        }}
                      />
                    )}
                  </div>

                  {/* Address — only if home/other visits */}
                  {(fam.preferredLocation === "home" || fam.preferredLocation === "other") && fam.homeNeighborhood && (
                    <div className="mb-2 text-[12px] text-seed-500">
                      📍 {fam.homeNeighborhood}{fam.homeCity ? `, ${fam.homeCity}` : ""}
                    </div>
                  )}

                  {/* Children */}
                  <div className="space-y-2">
                    {fam.children.map((child) => {
                      const bds = breakdownsByChild[child.id] ?? [];
                      return (
                        <div key={child.id} className="rounded-xl bg-seed-50 px-3 py-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[14px] font-semibold text-seed-900">{child.firstName} {child.lastName}</span>
                            <span className="text-[12px] text-seed-400">age {child.ageYears}</span>
                          </div>
                          {bds.length > 0 && (
                            <div className="space-y-1">
                              {bds.map((b) => (
                                <div key={b.discipline}>
                                  <div className="flex justify-between text-[11px] mb-0.5">
                                    <span className="font-semibold text-seed-600">{b.discipline}</span>
                                    <span className={`${b.remaining === 0 ? "text-rind-600 font-semibold" : b.remaining < 2 && dEnd <= 7 ? "text-melon-600 font-semibold" : "text-seed-500"}`}>
                                      {b.delivered + b.scheduled}/{b.allotted}h{b.remaining > 0 ? ` · ${fmtHrs(b.remaining)} left` : " · full"}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-seed-200 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${b.remaining === 0 ? "bg-rind-500" : "bg-melon-400"}`}
                                      style={{ width: `${Math.min(100, b.allotted > 0 ? ((b.delivered + b.scheduled) / b.allotted) * 100 : 0)}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Availability — compact */}
                  {fam.children[0] && (availByChild[fam.children[0].id]?.length ?? 0) > 0 && (
                    <div className="mt-2 text-[12px] text-seed-500">
                      <span className="font-medium text-seed-600">Avail: </span>
                      {(availByChild[fam.children[0].id] ?? []).map((w, i) => (
                        <span key={i}>{i > 0 ? " · " : ""}{DAYS[w.dayOfWeek]} {fmtMin(w.startMinutes)}–{fmtMin(w.endMinutes)}</span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
