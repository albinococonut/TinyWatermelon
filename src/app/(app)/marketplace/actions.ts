"use server";

import { requireSession } from "@/lib/rbac";
import { sendSmartOffer, confirmForFamily } from "@/lib/offers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { rankCandidates, commuteLegFor, type SlotContext } from "@/lib/matching";
import type { Discipline } from "@/lib/types";

/** Send smart offers for the top N upcoming open slots */
export async function actionOfferTopSlots(count: number = 2) {
  const ctx = await requireSession({ allowedRoles: ["OWNER", "ADMIN"] });

  const topSlots = await prisma.appointment.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: "OPEN_SLOT",
      startsAt: { gte: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: count,
    select: { id: true },
  });

  const results = await Promise.allSettled(
    topSlots.map(s => sendSmartOffer(s.id, ctx.organizationId, ctx.userId))
  );

  const sent = results.filter(
    r => r.status === "fulfilled" && (r.value as { ok: boolean }).ok
  ).length;

  revalidatePath("/marketplace");
  return { ok: true, sent, total: topSlots.length };
}

export async function actionSendOffer(slotId: string) {
  const ctx = await requireSession({ allowedRoles: ["OWNER", "ADMIN", "PROVIDER"] });
  const result = await sendSmartOffer(slotId, ctx.organizationId, ctx.userId);
  revalidatePath("/marketplace");
  return result;
}

export async function actionConfirmForFamily(slotId: string, childId: string) {
  const ctx = await requireSession({ allowedRoles: ["OWNER", "ADMIN", "PROVIDER"] });
  const result = await confirmForFamily(slotId, childId, ctx.organizationId, ctx.userId);
  revalidatePath("/marketplace");
  return result;
}

export async function getSlotCandidates(slotId: string) {
  const ctx = await requireSession({ allowedRoles: ["OWNER", "ADMIN", "PROVIDER"] });

  const slot = await prisma.appointment.findFirst({
    where: { id: slotId, organizationId: ctx.organizationId, status: "OPEN_SLOT" },
    include: { provider: { select: { name: true } } },
  });
  if (!slot) return { candidates: [], leg: null };

  const slotCtx: SlotContext = {
    slotId: slot.id,
    organizationId: slot.organizationId,
    providerId: slot.providerId,
    discipline: slot.discipline as Discipline,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    slotLat: slot.locationLat ?? 32.8014,
    slotLng: slot.locationLng ?? -117.2575,
    slotLabel: slot.locationAddress ?? "Visit location",
  };

  const today = new Date();
  const [candidates, leg] = await Promise.all([
    rankCandidates(slotCtx, today),
    commuteLegFor(slotCtx),
  ]);

  return { candidates, leg };
}

export async function getFamilySlots(familyId: string) {
  const ctx = await requireSession({ allowedRoles: ["OWNER", "ADMIN", "PROVIDER"] });

  // Get family's children and their authorized service disciplines
  const family = await prisma.family.findFirst({
    where: { id: familyId, organizationId: ctx.organizationId },
    include: {
      children: {
        where: { deletedAt: null },
        include: {
          authorizedServices: { where: { deletedAt: null }, select: { discipline: true, monthlyHours: true } },
        },
      },
    },
  });
  if (!family) return { family: null, slots: [] };

  // Get all disciplines this family's children are authorized for
  const disciplines = [...new Set(family.children.flatMap(c => c.authorizedServices.map(s => s.discipline)))];

  // Find open slots matching those disciplines, ordered by soonest first
  const slots = await prisma.appointment.findMany({
    where: {
      organizationId: ctx.organizationId,
      status: "OPEN_SLOT",
      discipline: { in: disciplines },
      startsAt: { gte: new Date() },
    },
    include: { provider: { select: { name: true, discipline: true } } },
    orderBy: { startsAt: "asc" },
    take: 20,
  });

  // Enrich each slot with commute feasibility data (parallel, fail-safe)
  const slotsWithCommute = await Promise.all(
    slots.map(async (slot) => {
      const slotCtx: SlotContext = {
        slotId: slot.id,
        organizationId: slot.organizationId,
        providerId: slot.providerId,
        discipline: slot.discipline as Discipline,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        slotLat: slot.locationLat ?? 32.8014,
        slotLng: slot.locationLng ?? -117.2575,
        slotLabel: slot.locationAddress ?? "Visit location",
      };
      let leg: { minutes: number; band: string; minutesToNextAppt: number | null } | null = null;
      try { leg = await commuteLegFor(slotCtx); } catch {}
      return { ...slot, leg };
    })
  );

  return { family, slots: slotsWithCommute };
}
