// Matching engine — for a given open provider slot, rank the families
// who could realistically take it.
//
// Hard filters:
//   - Child must be authorized for the slot's discipline
//   - Child must still have bucket room (unless they're owed a makeup)
//   - Provider must be able to physically reach the slot in time (commute
//     from prior appointment or from school base + buffer + drive < slot start)
//
// Soft signals (score):
//   - Owed unrecovered visits in this discipline (+70 + 10 per missed)
//   - Month-end urgency
//   - Lower commute
//   - Within parent's stated availability window

import { prisma } from "./db";
import { SCHOOL_ADDRESS, estimateDrive, type Address, type DriveEstimate } from "./commute";
import { bucketRoomThisMonth, currentMonthBounds, daysUntilMonthEnd } from "./buckets";
import type { Discipline } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SlotContext {
  slotId: string;
  organizationId: string;
  providerId: string;
  discipline: Discipline;
  startsAt: Date;
  endsAt: Date;
  // Where the slot will be held (school | family home | other)
  slotLat: number;
  slotLng: number;
  slotLabel: string;
}

export interface CommuteInsight {
  fromAddress: Address;
  fromSource: "previous_appointment" | "school";
  toAddress: Address;
  minutes: number;
  miles: number;
  band: DriveEstimate["trafficBand"];
  feasible: boolean;
  slackMinutes: number; // negative = late
  minutesToNextAppt: number | null; // minutes spare before next appointment (negative = conflict)
}

export interface RankedCandidate {
  childId: string;
  childName: string;        // for UI; PHI — only show inside authenticated app
  familyId: string;
  childAddress: Address;
  reason: string;
  score: number;
  driveMinutes: number;
  driveMiles: number;
  withinAvailability: boolean;
  warnings: string[];
  arrivalSlackMinutes: number;
  missedSessionCount: number;
  missedSessionHours: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Commute leg — what's the drive from where the provider will be before
// this slot to where the slot is being held?
// ─────────────────────────────────────────────────────────────────────────────

export async function commuteLegFor(slot: SlotContext): Promise<CommuteInsight> {
  // Find this provider's prior active appointment on the same day
  const dayStart = new Date(slot.startsAt);
  dayStart.setHours(0, 0, 0, 0);

  const provider = await prisma.provider.findUnique({
    where: { id: slot.providerId },
    select: {
      bufferMinutes: true,
      startAddress: true,
      startLat: true,
      startLng: true,
    },
  });
  const bufferMinutes = provider?.bufferMinutes ?? 15;

  const prior = await prisma.appointment.findFirst({
    where: {
      providerId: slot.providerId,
      startsAt: { gte: dayStart, lt: slot.startsAt },
      status: { in: ["SCHEDULED", "COMPLETED", "FILLED_MAKEUP"] },
      NOT: { id: slot.slotId },
    },
    orderBy: { endsAt: "desc" },
    select: {
      endsAt: true,
      locationLat: true,
      locationLng: true,
      locationAddress: true,
    },
  });

  // From either prior session OR school base
  let fromAddress: Address;
  let fromSource: CommuteInsight["fromSource"];
  let previousEnd: Date | null = null;
  if (prior && prior.locationLat != null && prior.locationLng != null) {
    fromAddress = {
      label: prior.locationAddress ?? "Prior visit",
      lat: prior.locationLat,
      lng: prior.locationLng,
    };
    fromSource = "previous_appointment";
    previousEnd = prior.endsAt;
  } else if (provider?.startLat != null && provider.startLng != null) {
    fromAddress = {
      label: provider.startAddress ?? "Provider start",
      lat: provider.startLat,
      lng: provider.startLng,
    };
    fromSource = "school";
  } else {
    fromAddress = SCHOOL_ADDRESS;
    fromSource = "school";
  }

  const toAddress: Address = {
    label: slot.slotLabel,
    lat: slot.slotLat,
    lng: slot.slotLng,
  };
  const drive = estimateDrive(fromAddress, toAddress, slot.startsAt);

  const requiredReadyTime = new Date(slot.startsAt.getTime() - bufferMinutes * 60_000);
  const departureLatest = new Date(requiredReadyTime.getTime() - drive.minutes * 60_000);
  const departureSource = previousEnd ?? slot.startsAt;
  const slackMinutes =
    fromSource === "school"
      ? 9999
      : Math.round((departureLatest.getTime() - departureSource.getTime()) / 60_000);

  // ── Next-appointment feasibility ──────────────────────────────────────────
  // After this slot ends, can the provider reach their next appointment in time?
  let minutesToNextAppt: number | null = null;

  const nextAppt = await prisma.appointment.findFirst({
    where: {
      providerId: slot.providerId,
      organizationId: slot.organizationId,
      startsAt: { gt: slot.endsAt },
      status: { in: ["SCHEDULED", "FILLED_MAKEUP"] },
      NOT: { id: slot.slotId },
    },
    orderBy: { startsAt: "asc" },
    select: { startsAt: true, locationLat: true, locationLng: true, locationAddress: true },
  });

  if (nextAppt && nextAppt.locationLat != null && nextAppt.locationLng != null) {
    const nextAddr: Address = {
      label: nextAppt.locationAddress ?? "Next appointment",
      lat: nextAppt.locationLat,
      lng: nextAppt.locationLng,
    };
    const driveToNext = estimateDrive(toAddress, nextAddr, slot.endsAt);
    const availableMinutes = (nextAppt.startsAt.getTime() - slot.endsAt.getTime()) / 60_000;
    minutesToNextAppt = Math.round(availableMinutes - driveToNext.minutes - bufferMinutes);
  }

  return {
    fromAddress,
    fromSource,
    toAddress,
    minutes: drive.minutes,
    miles: drive.miles,
    band: drive.trafficBand,
    feasible: slackMinutes >= 0,
    slackMinutes,
    minutesToNextAppt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recoverable missed sessions — Pool A.
// Same definition as revenue.ts but exposed here as a helper.
// ─────────────────────────────────────────────────────────────────────────────

export async function recoverableMissedSessions(organizationId: string, today: Date = new Date()) {
  const { start, end } = currentMonthBounds(today);
  return prisma.appointment.findMany({
    where: {
      organizationId,
      startsAt: { gte: start, lte: end },
      status: { in: ["CANCELLED_FAMILY", "CANCELLED_PROVIDER"] },
      filledByAppointmentId: null,
      childId: { not: null },
    },
    select: {
      id: true,
      childId: true,
      discipline: true,
      startsAt: true,
      endsAt: true,
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Rank candidates for an open slot.
// ─────────────────────────────────────────────────────────────────────────────

export async function rankCandidates(
  slot: SlotContext,
  today: Date = new Date(),
): Promise<RankedCandidate[]> {
  // Pull all kids in the org authorized for this slot's discipline.
  const candidates = await prisma.child.findMany({
    where: {
      organizationId: slot.organizationId,
      deletedAt: null,
      authorizedServices: {
        some: { discipline: slot.discipline, deletedAt: null },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      family: {
        select: {
          id: true,
          preferredLocation: true,
          homeAddress: true,
          homeLat: true,
          homeLng: true,
          homeNeighborhood: true,
          homeCity: true,
        },
      },
    },
  });

  // How many missed sessions does each child have for THIS discipline?
  const missed = await recoverableMissedSessions(slot.organizationId, today);
  const missedByChild = new Map<string, { count: number; hours: number }>();
  for (const a of missed) {
    if (!a.childId) continue;
    if (a.discipline !== slot.discipline) continue;
    const hours = (a.endsAt.getTime() - a.startsAt.getTime()) / 3_600_000;
    const cur = missedByChild.get(a.childId) ?? { count: 0, hours: 0 };
    missedByChild.set(a.childId, { count: cur.count + 1, hours: cur.hours + hours });
  }

  // Commute leg once — same for every candidate (the slot's "from" is fixed).
  const leg = await commuteLegFor(slot);
  const dEnd = daysUntilMonthEnd(today);

  const out: RankedCandidate[] = [];

  for (const c of candidates) {
    const warnings: string[] = [];

    // Resolve child's address for the visit
    const childAddr = resolveChildAddress(c.family);
    if (!childAddr) continue; // skip if we can't geolocate

    // Recompute drive from the prior leg's "from" point to this specific child
    const drive = estimateDrive(leg.fromAddress, childAddr, slot.startsAt);

    // Feasibility: provider needs to arrive by slot.startsAt - buffer
    const bufferMinutes = 15;
    const requiredReadyTime = new Date(slot.startsAt.getTime() - bufferMinutes * 60_000);
    const departureLatest = new Date(requiredReadyTime.getTime() - drive.minutes * 60_000);
    const departureSource = leg.fromSource === "school" ? slot.startsAt : leg.fromAddress;
    // (Approximation — for child-specific commute we re-use the prior end time)
    const slackMinutes =
      leg.fromSource === "school"
        ? 9999
        : leg.slackMinutes; // already computed with respect to prior session end

    const reachable = leg.fromSource === "school" || slackMinutes >= 0;
    if (!reachable) continue;

    if (slackMinutes >= 0 && slackMinutes < 5 && leg.fromSource === "previous_appointment") {
      warnings.push(`Tight: only ${slackMinutes} min slack after prior session`);
    }
    if (drive.minutes > 25) warnings.push(`Long drive (${drive.minutes} min)`);
    if (drive.trafficBand === "heavy") warnings.push("Heavy traffic window");

    const withinAvailability = await childIsAvailable(c.id, slot.startsAt, slot.endsAt);
    if (!withinAvailability) warnings.push("Outside parent's stated availability");

    // Bucket room — needed to know if a NEW visit is bookable
    const bucketRoom = await bucketRoomThisMonth(c.id, slot.discipline, today);
    const missedInfo = missedByChild.get(c.id) ?? { count: 0, hours: 0 };

    // Skip if no room and they're not owed a makeup (makeups borrow back the cancelled slot's hours)
    if (bucketRoom <= 0 && missedInfo.count === 0) continue;

    // Scoring
    let score = 0;
    if (missedInfo.count > 0) score += 70 + missedInfo.count * 10;
    if (dEnd <= 7 && bucketRoom > 0) score += 60;
    else if (dEnd <= 14 && bucketRoom > 0) score += 40;
    else if (bucketRoom > 0) score += 10;
    score += Math.max(0, 30 - drive.minutes);
    if (withinAvailability) score += 25;
    if (leg.fromSource === "previous_appointment" && slackMinutes >= 10) score += 10;

    let reason: string;
    if (missedInfo.hours > 0) {
      reason = `${missedInfo.hours.toFixed(1)}h available from missed visits · ${dEnd}d to month end`;
    } else if (bucketRoom > 0 && dEnd <= 10) {
      reason = `${bucketRoom.toFixed(1)}h of bucket left · ${dEnd}d to month end`;
    } else if (bucketRoom > 0) {
      reason = `${bucketRoom.toFixed(1)}h of bucket available`;
    } else {
      reason = "Monthly bucket already booked";
    }

    out.push({
      childId: c.id,
      childName: `${c.firstName} ${c.lastName[0]}.`,
      familyId: c.family.id,
      childAddress: childAddr,
      reason,
      score,
      driveMinutes: drive.minutes,
      driveMiles: drive.miles,
      withinAvailability,
      warnings,
      arrivalSlackMinutes: slackMinutes,
      missedSessionCount: missedInfo.count,
      missedSessionHours: missedInfo.hours,
    });
  }

  // Sort: highest score first; tiebreaker = shorter drive
  return out.sort((a, b) => b.score - a.score || a.driveMinutes - b.driveMinutes).slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

interface FamilyShape {
  preferredLocation: string | null;
  homeAddress: string | null;
  homeLat: number | null;
  homeLng: number | null;
  homeNeighborhood: string | null;
  homeCity: string | null;
}

function resolveChildAddress(family: FamilyShape): Address | null {
  // For now we always use the home address when known; "school" preference
  // means the slot is already at school (no commute). "other" addresses
  // require an OtherAddress table we haven't built yet — fall back to home.
  if (family.homeLat != null && family.homeLng != null) {
    return {
      label: family.homeAddress ?? "Family home",
      lat: family.homeLat,
      lng: family.homeLng,
      neighborhood: family.homeNeighborhood ?? undefined,
      city: family.homeCity ?? undefined,
    };
  }
  // Default to school if no home address on file
  return SCHOOL_ADDRESS;
}

async function childIsAvailable(
  childId: string,
  start: Date,
  end: Date,
): Promise<boolean> {
  const dayOfWeek = start.getDay();
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const windows = await prisma.parentAvailability.findMany({
    where: { childId, dayOfWeek },
    select: { startMinutes: true, endMinutes: true },
  });
  return windows.some(
    (w) => w.startMinutes <= startMinutes && w.endMinutes >= endMinutes,
  );
}
