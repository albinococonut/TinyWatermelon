"use server";

import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// Any role can act on their own day view (providers, coordinators, admins).
async function getCtx() {
  return requireSession();
}

// ─── Mark a visit complete ───────────────────────────────────────────────────
export async function actionMarkComplete(appointmentId: string) {
  const ctx = await getCtx();
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId, organizationId: ctx.organizationId },
    select: { status: true },
  });
  if (!appt) return { ok: false, error: "Visit not found" };

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "COMPLETED" },
  });
  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "UPDATE",
    resourceType: "Appointment",
    resourceId: appointmentId,
    meta: { event: "marked_complete" },
  });
  revalidatePath("/me");
  return { ok: true };
}

// ─── Mark running late (note only) ───────────────────────────────────────────
export async function actionMarkRunningLate(appointmentId: string) {
  const ctx = await getCtx();
  await prisma.appointment.update({
    where: { id: appointmentId, organizationId: ctx.organizationId },
    data: { notes: "Provider running late" },
  });
  revalidatePath("/me");
  return { ok: true };
}

// ─── Log a no-show (family didn't show) ──────────────────────────────────────
export async function actionLogNoShow(appointmentId: string) {
  const ctx = await getCtx();
  await prisma.appointment.update({
    where: { id: appointmentId, organizationId: ctx.organizationId },
    data: {
      status: "CANCELLED_FAMILY",
      cancellationReason: "PARENT_FORGOT",
      cancelledBy: "family",
      cancelledAt: new Date(),
      notes: "No show — flagged from provider day view",
    },
  });
  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "UPDATE",
    resourceType: "Appointment",
    resourceId: appointmentId,
    meta: { event: "no_show" },
  });
  revalidatePath("/me");
  return { ok: true };
}

// ─── Provider cancels a visit → creates an open slot ─────────────────────────
export async function actionCancelVisit(appointmentId: string) {
  const ctx = await getCtx();

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId, organizationId: ctx.organizationId },
    select: {
      id: true, providerId: true, discipline: true,
      startsAt: true, endsAt: true,
      locationLat: true, locationLng: true, locationAddress: true,
      organizationId: true,
    },
  });
  if (!appt) return { ok: false, error: "Visit not found" };

  // Mark the original as provider-cancelled
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CANCELLED_PROVIDER",
      cancellationReason: "PROVIDER_OUT",
      cancelledBy: "provider",
      cancelledAt: new Date(),
      childId: null,
    },
  });

  // Create the paired OPEN_SLOT so the Recovery Queue picks it up
  const openSlot = await prisma.appointment.create({
    data: {
      organizationId: appt.organizationId,
      providerId: appt.providerId,
      discipline: appt.discipline,
      startsAt: appt.startsAt,
      endsAt: appt.endsAt,
      locationType: "school",
      locationLat: appt.locationLat,
      locationLng: appt.locationLng,
      locationAddress: appt.locationAddress,
      status: "OPEN_SLOT",
      notes: "Provider cancellation — opened to recovery queue",
    },
  });

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "UPDATE",
    resourceType: "Appointment",
    resourceId: appointmentId,
    meta: { event: "provider_cancelled", openSlotId: openSlot.id },
  });
  revalidatePath("/me");
  revalidatePath("/marketplace");
  return { ok: true, openSlotId: openSlot.id };
}

// ─── Cancel appointment from provider view ────────────────────────────────────
export async function cancelAppointment(
  appointmentId: string,
  reason: string,
): Promise<{ openSlotId: string | null }> {
  const ctx = await requireSession();

  const appt = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: ctx.organizationId,
      ...(ctx.role === "PROVIDER" && ctx.providerId ? { providerId: ctx.providerId } : {}),
    },
  });
  if (!appt) throw new Error("Appointment not found");
  if (appt.status === "CANCELLED_FAMILY" || appt.status === "CANCELLED_PROVIDER") {
    return { openSlotId: null };
  }

  const cancelledBy = reason === "family_cancel" ? "family" : "provider";
  const cancelStatus = reason === "family_cancel" ? "CANCELLED_FAMILY" : "CANCELLED_PROVIDER";

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: cancelStatus, cancellationReason: reason, cancelledAt: new Date(), cancelledBy },
  });

  // Create an OPEN_SLOT so this time becomes recoverable
  const openSlot = await prisma.appointment.create({
    data: {
      organizationId: appt.organizationId,
      providerId: appt.providerId,
      discipline: appt.discipline,
      startsAt: appt.startsAt,
      endsAt: appt.endsAt,
      locationType: appt.locationType,
      locationAddress: appt.locationAddress,
      locationLat: appt.locationLat,
      locationLng: appt.locationLng,
      status: "OPEN_SLOT",
      notes: `${cancelledBy === "family" ? "Family" : "Provider"} cancelled — provider time opened for recovery`,
    },
  });

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "CANCEL_APPOINTMENT",
    resourceType: "Appointment",
    resourceId: appointmentId,
    meta: { reason, openSlotId: openSlot.id },
  });

  revalidatePath("/me");
  return { openSlotId: openSlot.id };
}

// ─── Undo a completion (revert COMPLETED → SCHEDULED) ────────────────────────
export async function uncompleteAppointment(appointmentId: string) {
  const ctx = await requireSession();

  const appt = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: ctx.organizationId,
      ...(ctx.role === "PROVIDER" && ctx.providerId ? { providerId: ctx.providerId } : {}),
    },
  });
  if (!appt) throw new Error("Appointment not found");

  if (appt.status === "COMPLETED" || appt.status === "FILLED_MAKEUP") {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "SCHEDULED" },
    });
    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "UPDATE",
      resourceType: "Appointment",
      resourceId: appointmentId,
      meta: { action: "undid_complete" },
    });
  } else if (appt.status === "CANCELLED_FAMILY" || appt.status === "CANCELLED_PROVIDER") {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "SCHEDULED", cancellationReason: null, cancelledBy: null, cancelledAt: null },
    });
    // Remove the paired OPEN_SLOT if it still exists and hasn't been filled
    await prisma.appointment.deleteMany({
      where: {
        organizationId: ctx.organizationId,
        providerId: appt.providerId,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
        status: "OPEN_SLOT",
      },
    });
    await audit({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "UPDATE",
      resourceType: "Appointment",
      resourceId: appointmentId,
      meta: { action: "undid_cancellation" },
    });
    revalidatePath("/marketplace");
  } else {
    return; // nothing to undo
  }

  revalidatePath("/me");
}

// ─── Undo a cancellation (revert CANCELLED → SCHEDULED, remove paired open slot) ─
export async function uncancelAppointment(appointmentId: string) {
  const ctx = await requireSession();

  const appt = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: ctx.organizationId,
      ...(ctx.role === "PROVIDER" && ctx.providerId ? { providerId: ctx.providerId } : {}),
    },
  });
  if (!appt) throw new Error("Appointment not found");
  if (appt.status !== "CANCELLED_FAMILY" && appt.status !== "CANCELLED_PROVIDER") return;

  // Revert the appointment to scheduled
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "SCHEDULED",
      cancellationReason: null,
      cancelledBy: null,
      cancelledAt: null,
      childId: appt.childId, // restore (was nulled on provider cancel)
    },
  });

  // Delete the paired OPEN_SLOT if it still exists and hasn't been filled
  await prisma.appointment.deleteMany({
    where: {
      organizationId: ctx.organizationId,
      providerId: appt.providerId,
      startsAt: appt.startsAt,
      endsAt: appt.endsAt,
      status: "OPEN_SLOT",
    },
  });

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "UPDATE",
    resourceType: "Appointment",
    resourceId: appointmentId,
    meta: { action: "undid_cancellation" },
  });

  revalidatePath("/me");
  revalidatePath("/marketplace");
}

// ─── Complete appointment from provider view ──────────────────────────────────
export async function completeAppointment(appointmentId: string) {
  const ctx = await requireSession();

  const appt = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: ctx.organizationId,
      ...(ctx.role === "PROVIDER" && ctx.providerId ? { providerId: ctx.providerId } : {}),
    },
  });
  if (!appt) throw new Error("Appointment not found");
  if (appt.status !== "SCHEDULED" && appt.status !== "FILLED_MAKEUP") return;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "COMPLETED" },
  });

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "UPDATE",
    resourceType: "Appointment",
    resourceId: appointmentId,
    meta: { action: "marked_complete" },
  });

  revalidatePath("/me");
}

// ─── Mark full-day unavailable ────────────────────────────────────────────────
export async function actionMarkUnavailable(providerId: string) {
  const ctx = await getCtx();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const remaining = await prisma.appointment.findMany({
    where: {
      organizationId: ctx.organizationId,
      providerId,
      status: "SCHEDULED",
      startsAt: { gte: today, lte: todayEnd },
    },
    select: {
      id: true, discipline: true,
      startsAt: true, endsAt: true,
      locationLat: true, locationLng: true, locationAddress: true,
    },
  });

  let openedCount = 0;
  for (const appt of remaining) {
    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: "CANCELLED_PROVIDER",
        cancellationReason: "PROVIDER_OUT",
        cancelledBy: "provider",
        cancelledAt: new Date(),
        childId: null,
      },
    });
    await prisma.appointment.create({
      data: {
        organizationId: ctx.organizationId,
        providerId,
        discipline: appt.discipline,
        startsAt: appt.startsAt,
        endsAt: appt.endsAt,
        locationType: "school",
        locationLat: appt.locationLat,
        locationLng: appt.locationLng,
        locationAddress: appt.locationAddress,
        status: "OPEN_SLOT",
        notes: "Provider marked out — opened to recovery queue",
      },
    });
    openedCount++;
  }

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "UPDATE",
    resourceType: "Provider",
    resourceId: providerId,
    meta: { event: "marked_unavailable", openedSlots: openedCount },
  });
  revalidatePath("/me");
  revalidatePath("/marketplace");
  return { ok: true, openedCount };
}
