import { requireSession, providerScope } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { computeRevenue } from "@/lib/revenue";
import { daysUntilMonthEnd, currentMonthBounds } from "@/lib/buckets";
import { familiesNeedingVisits } from "@/lib/offers";
import { PageHeader } from "@/components/PageHeader";
import { RevenueBand } from "@/components/RevenueBand";
import { SendAllOffersButton } from "./SendAllOffersButton";
import { IgnorableSlotList } from "./IgnorableSlotList";
import { FamilyNeedsSection } from "./FamilyNeedsSection";
import { headers } from "next/headers";

function StatBox({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: "melon" | "rind" | "seed" }) {
  const valCls = { melon: "text-melon-700", rind: "text-rind-700", seed: "text-seed-700" }[accent];
  return (
    <div className="rounded-2xl border border-seed-200 bg-white p-4 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-seed-400">{label}</div>
      <div className={`mt-1.5 text-[24px] font-semibold tabular-nums ${valCls}`}>{value}</div>
      <div className="mt-0.5 text-[12px] text-seed-400">{hint}</div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const ctx = await requireSession();
  const today = new Date();

  const h = headers();
  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "READ",
    resourceType: "Marketplace",
    resourceId: ctx.organizationId,
    ipAddress: h.get("x-forwarded-for") ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  });

  // PROVIDER role: only see their own open slots (HIPAA minimum-necessary)
  const scope = providerScope(ctx);
  // Start of current week (Monday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
  weekStart.setHours(0, 0, 0, 0);

  const [openSlots, makeupNeeds, rev, providerCount, familyCount, recentlyFilledSlots] = await Promise.all([
    prisma.appointment.findMany({
      where: { organizationId: ctx.organizationId, status: "OPEN_SLOT", ...scope },
      orderBy: { startsAt: "asc" },
      include: { provider: true },
    }),
    familiesNeedingVisits(ctx.organizationId, today),
    computeRevenue(ctx.organizationId, today),
    prisma.provider.count({ where: { organizationId: ctx.organizationId, deletedAt: null } }),
    prisma.family.count({ where: { organizationId: ctx.organizationId, deletedAt: null } }),
    // Slots filled this week — shown at bottom of list persistently
    prisma.appointment.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: "FILLED_MAKEUP",
        startsAt: { gte: weekStart },
        ...scope,
      },
      orderBy: { startsAt: "asc" },
      include: { provider: { select: { name: true } } },
      take: 20,
    }),
  ]);

  const dEnd = daysUntilMonthEnd(today);

  const liveOffers = await prisma.smartOffer.findMany({
    where: { organizationId: ctx.organizationId, status: "LIVE" },
    select: { appointmentId: true },
  });
  const liveSlotIds = new Set(liveOffers.map((o) => o.appointmentId));

  const slotData = openSlots.map((slot) => ({
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    discipline: slot.discipline,
    providerName: slot.provider.name,
  }));

  // Build families-needing-visits — single batched query instead of N+1
  const childIds = Array.from(makeupNeeds.keys());
  const needsChildren = childIds.length > 0
    ? await prisma.child.findMany({
        where: { id: { in: childIds } },
        select: { id: true, firstName: true, lastName: true, familyId: true },
      })
    : [];
  const childMap = new Map(needsChildren.map((c) => [c.id, c]));
  const makeupList = Array.from(makeupNeeds.entries())
    .map(([childId, info]) => {
      const child = childMap.get(childId);
      return child
        ? { childId, familyId: child.familyId, childName: `${child.firstName} ${child.lastName[0]}.`, ...info }
        : null;
    })
    .filter(Boolean) as { childId: string; familyId: string; childName: string; hours: number; discipline: string }[];

  // Fetch established provider for each makeup need
  const { start: mStart, end: mEnd } = currentMonthBounds(today);
  const makeupListWithProviders = await Promise.all(
    makeupList.map(async (m) => {
      const appt = await prisma.appointment.findFirst({
        where: {
          childId: m.childId,
          discipline: m.discipline,
          organizationId: ctx.organizationId,
          startsAt: { gte: mStart, lte: mEnd },
          status: { in: ["SCHEDULED", "COMPLETED", "FILLED_MAKEUP"] },
        },
        include: { provider: { select: { name: true } } },
      });
      return { ...m, providerName: appt?.provider?.name ?? null };
    })
  );

  const totalHours = makeupListWithProviders.reduce((s, m) => s + m.hours, 0);

  return (
    <div>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-melon-500" /> Live ops
          </span>
        }
        title="Recovery Queue"
        subtitle="Bookable provider openings matched to families with visits owed before this month's capacity resets."
      />

      <div className="space-y-6 px-5 py-6 md:px-10 md:py-8">
        <RevenueBand rev={rev} daysToMonthEnd={dEnd} />

        {/* Stat boxes below RevenueBand */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatBox label="Service hours recovered" value={`${rev.recoveredLast30DaysCount} visits`} hint="Last 30 days" accent="rind" />
          <StatBox label="Service hours lost" value={`${rev.lostHours.toFixed(1)}h`} hint="Last month · capacity reset" accent="seed" />
          <StatBox label="Active providers" value={String(providerCount)} hint="In your organization" accent="seed" />
          <StatBox label="Families enrolled" value={String(familyCount)} hint="Across all disciplines" accent="melon" />
        </section>

        {/* Families needing visits */}
        {makeupListWithProviders.length > 0 && (
          <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4 md:p-5">
            <FamilyNeedsSection
              needs={makeupListWithProviders}
              dEnd={dEnd}
              totalHours={totalHours}
            />
          </section>
        )}

        {/* Open slots */}
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="text-[18px] font-semibold tracking-tight text-seed-900">Unfilled Provider Slots</h2>
          <span className="rounded-md bg-rind-50 px-2 py-0.5 text-[12px] font-semibold text-rind-700">
            {openSlots.length} bookable
          </span>
        </div>

        {openSlots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-seed-200 bg-white p-10 text-center text-[15px] text-seed-500">
            No openings right now. Every provider hour this week is booked.
          </div>
        ) : (
          <div className="space-y-4">
            <SendAllOffersButton
              slotIds={slotData.map((s) => s.id)}
              firstSlot={slotData[0] ? { providerName: slotData[0].providerName, startsAt: slotData[0].startsAt, discipline: slotData[0].discipline } : undefined}
            />
            <IgnorableSlotList
              slots={slotData}
              liveSlotIds={Array.from(liveSlotIds)}
              dbFilledSlots={recentlyFilledSlots.map(s => ({
                id: s.id,
                startsAt: s.startsAt.toISOString(),
                endsAt: s.endsAt.toISOString(),
                discipline: s.discipline,
                providerName: s.provider?.name ?? "",
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
