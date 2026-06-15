// Revenue calculations for the Visit Recovery Dashboard.
//
// Core metric framework (Option B, auth-month scope):
//
//  Family hours owed this month  = authorized hours − (delivered + scheduled) this month
//  Provider openings this month  = OPEN_SLOT hours + CANCELLED_* hours this month
//  Recoverable service hours     = min(family hours owed, provider openings)
//
//  Smart insight:
//    If family hours owed > provider openings →
//      gap hours "not recoverable because of shortage of provider availability"
//    If provider openings > family hours owed →
//      gap hours "not fillable because of shortage of family service hours"

import { prisma } from "./db";
import { currentMonthBounds } from "./buckets";
import { DEFAULT_RATES, type Discipline } from "./types";

export interface RevenueSnapshot {
  // ─── New framework ───────────────────────────────────────────────────────
  familyHoursNotScheduledThisMonth: number;     // authorized − used, all families
  providerOpeningsThisMonth: number;    // open + cancelled hours this month

  // Recoverable = min of the two above
  recoverableHours: number;
  recoverableValue: number;

  // Smart insight
  gapHours: number;
  gapType: "provider_shortage" | "family_shortage" | "balanced";

  // ─── Supporting counts ───────────────────────────────────────────────────
  openSlotsCount: number;
  openSlotsHours: number;
  openSlotsValue: number;

  // ─── Lost last month ─────────────────────────────────────────────────────
  lostHours: number;
  lostValue: number;

  // ─── Recovered last 30 days ──────────────────────────────────────────────
  recoveredLast30DaysCount: number;
  recoveredLast30DaysValue: number;
  recoveredAllTimeValue: number;

  // ─── Legacy fields (kept for any existing references) ────────────────────
  recoverableSessionCount: number;
  recoverableChildCount: number;
  atRiskSessionCount: number;
  atRiskValue: number;
}

async function loadRates(organizationId: string): Promise<Record<Discipline, number>> {
  const rows = await prisma.rateSetting.findMany({
    where: { organizationId },
    select: { discipline: true, gpPerHour: true },
  });
  const result = { ...DEFAULT_RATES };
  for (const r of rows) result[r.discipline as Discipline] = r.gpPerHour;
  return result;
}

function hoursOf(a: { startsAt: Date; endsAt: Date }): number {
  return (a.endsAt.getTime() - a.startsAt.getTime()) / 3_600_000;
}

export async function computeRevenue(
  organizationId: string,
  today: Date = new Date(),
): Promise<RevenueSnapshot> {
  const { start, end } = currentMonthBounds(today);
  const rates = await loadRates(organizationId);
  const thirtyAgo = new Date(today.getTime() - 30 * 86_400_000);

  // ── Run all queries in parallel ───────────────────────────────────────────
  const [
    authorizedServices,
    usageThisMonth,
    openingsThisMonth,
    openSlots,
    recoveredLast30,
    allFilled,
    lostRows,
  ] = await Promise.all([
    // All authorized services for this org's children
    prisma.authorizedService.findMany({
      where: { child: { organizationId }, deletedAt: null },
      select: { childId: true, discipline: true, monthlyHours: true },
    }),

    // Appointments this month that consume bucket hours
    prisma.appointment.findMany({
      where: {
        organizationId,
        startsAt: { gte: start, lte: end },
        status: { in: ["COMPLETED", "FILLED_MAKEUP", "SCHEDULED"] },
        childId: { not: null },
      },
      select: { childId: true, discipline: true, startsAt: true, endsAt: true },
    }),

    // Provider openings this month: OPEN_SLOT + CANCELLED_*
    prisma.appointment.findMany({
      where: {
        organizationId,
        startsAt: { gte: start, lte: end },
        status: { in: ["OPEN_SLOT", "CANCELLED_FAMILY", "CANCELLED_PROVIDER"] },
      },
      select: { startsAt: true, endsAt: true, discipline: true },
    }),

    // Current open slots (for count/value display)
    prisma.appointment.findMany({
      where: { organizationId, status: "OPEN_SLOT" },
      select: { discipline: true, startsAt: true, endsAt: true },
    }),

    // Recovered last 30 days
    prisma.recoveredRevenueEvent.findMany({
      where: { organizationId, occurredAt: { gte: thirtyAgo } },
      select: { amount: true },
    }),

    // All filled makeups (for all-time)
    prisma.recoveredRevenueEvent.findMany({
      where: { organizationId },
      select: { amount: true },
    }),

    // Lost revenue events last 30 days
    prisma.lostRevenueEvent.findMany({
      where: { organizationId, occurredAt: { gte: thirtyAgo } },
      select: { discipline: true, hours: true },
    }),
  ]);

  // ── Family hours owed this month ──────────────────────────────────────────
  // Build usage map: childId:discipline → hours consumed
  const usage: Record<string, number> = {};
  for (const a of usageThisMonth) {
    if (!a.childId) continue;
    const key = `${a.childId}:${a.discipline}`;
    usage[key] = (usage[key] ?? 0) + hoursOf(a);
  }

  let familyHoursNotScheduledThisMonth = 0;
  const owedByChild = new Set<string>();
  for (const svc of authorizedServices) {
    const key = `${svc.childId}:${svc.discipline}`;
    const used = usage[key] ?? 0;
    const remaining = Math.max(0, svc.monthlyHours - used);
    if (remaining > 0) {
      familyHoursNotScheduledThisMonth += remaining;
      owedByChild.add(svc.childId);
    }
  }

  // ── Provider openings this month ──────────────────────────────────────────
  const providerOpeningsThisMonth = openingsThisMonth.reduce((s, a) => s + hoursOf(a), 0);

  // ── Recoverable = min of both ─────────────────────────────────────────────
  const recoverableHours = Math.min(familyHoursNotScheduledThisMonth, providerOpeningsThisMonth);
  const recoverableValue = recoverableHours *
    (Object.values(rates).reduce((s, r) => s + r, 0) / Object.values(rates).length); // avg rate

  const gapHours = Math.abs(familyHoursNotScheduledThisMonth - providerOpeningsThisMonth);
  const gapType: RevenueSnapshot["gapType"] =
    gapHours < 0.5 ? "balanced"
    : familyHoursNotScheduledThisMonth > providerOpeningsThisMonth ? "provider_shortage"
    : "family_shortage";

  // ── Open slots ────────────────────────────────────────────────────────────
  const openSlotsHours = openSlots.reduce((s, a) => s + hoursOf(a), 0);
  const openSlotsValue = openSlots.reduce(
    (s, a) => s + hoursOf(a) * (rates[a.discipline as Discipline] ?? 0), 0,
  );

  // ── Lost last month ───────────────────────────────────────────────────────
  const lostHours = lostRows.reduce((s, e) => s + e.hours, 0);
  const lostValue = lostRows.reduce(
    (s, e) => s + e.hours * (rates[e.discipline as Discipline] ?? 0), 0,
  );

  // ── Recovered ─────────────────────────────────────────────────────────────
  const recoveredLast30DaysValue = recoveredLast30.reduce((s, e) => s + e.amount, 0);
  const recoveredAllTimeValue = allFilled.reduce((s, e) => s + e.amount, 0);

  return {
    familyHoursNotScheduledThisMonth,
    providerOpeningsThisMonth,
    recoverableHours,
    recoverableValue,
    gapHours,
    gapType,
    openSlotsCount: openSlots.length,
    openSlotsHours,
    openSlotsValue,
    lostHours,
    lostValue,
    recoveredLast30DaysCount: recoveredLast30.length,
    recoveredLast30DaysValue,
    recoveredAllTimeValue,
    // Legacy
    recoverableSessionCount: owedByChild.size,
    recoverableChildCount: owedByChild.size,
    atRiskSessionCount: 0,
    atRiskValue: 0,
  };
}

/** Dollar value of a single slot — uses provider's billing rate if set, else org rate. */
export async function slotValue(
  appointmentId: string,
  rates?: Record<Discipline, number>,
): Promise<number> {
  const a = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      discipline: true, startsAt: true, endsAt: true, organizationId: true,
      provider: { select: { billingRatePerHour: true } },
    },
  });
  if (!a) return 0;
  // Provider-specific rate overrides the org default
  const providerRate = a.provider?.billingRatePerHour ?? null;
  if (providerRate !== null) return hoursOf(a) * providerRate;
  const r = rates ?? (await loadRates(a.organizationId));
  return hoursOf(a) * (r[a.discipline as Discipline] ?? 0);
}
