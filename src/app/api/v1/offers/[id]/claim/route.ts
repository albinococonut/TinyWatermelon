// POST /api/v1/offers/:id/claim — first-confirmation claim for a family portal.
// Called from the magic-link portal /o/:token when the family taps "Confirm".
// The token auth check (rather than session) is done by the portal page
// before calling this endpoint.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { buildFilledSms } from "@/lib/offers";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const offerId = params.id;
  const body = (await req.json().catch(() => ({}))) as {
    childId?: string;
    familyToken?: string; // signed token proving family identity — validated by caller
  };

  if (!body.childId) {
    return NextResponse.json({ error: "childId required" }, { status: 400 });
  }

  // Load the offer
  const offer = await prisma.smartOffer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      appointmentId: true,
      organizationId: true,
      status: true,
      recipients: { select: { childId: true, status: true } },
    },
  });

  if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  if (offer.status !== "LIVE") {
    return NextResponse.json({ error: "This opening has already been filled.", alreadyClaimed: true }, { status: 409 });
  }

  const recipient = offer.recipients.find((r) => r.childId === body.childId);
  if (!recipient) {
    return NextResponse.json({ error: "Family not on this offer." }, { status: 403 });
  }

  const now = new Date();

  // Atomic claim
  await prisma.$transaction(async (tx) => {
    // Mark offer as claimed
    await tx.smartOffer.update({
      where: { id: offerId },
      data: { status: "CLAIMED", claimedByChildId: body.childId, claimedAt: now },
    });

    // Fill the appointment
    await tx.appointment.update({
      where: { id: offer.appointmentId },
      data: { childId: body.childId, status: "FILLED_MAKEUP" },
    });

    // Update recipient statuses
    await tx.smartOfferRecipient.updateMany({
      where: { smartOfferId: offerId, childId: body.childId },
      data: { status: "CLAIMED" },
    });
    await tx.smartOfferRecipient.updateMany({
      where: { smartOfferId: offerId, childId: { not: body.childId } },
      data: { status: "MISSED_OUT" },
    });

    // Snapshot revenue
    const slot = await tx.appointment.findUnique({
      where: { id: offer.appointmentId },
      select: { discipline: true, startsAt: true, endsAt: true, organizationId: true },
    });
    if (slot) {
      const hours = (slot.endsAt.getTime() - slot.startsAt.getTime()) / 3_600_000;
      const rate = await tx.rateSetting.findUnique({
        where: {
          organizationId_discipline: {
            organizationId: slot.organizationId,
            discipline: slot.discipline,
          },
        },
        select: { gpPerHour: true },
      });
      await tx.recoveredRevenueEvent.create({
        data: {
          organizationId: offer.organizationId,
          appointmentId: offer.appointmentId,
          childId: body.childId,
          amount: hours * (rate?.gpPerHour ?? 0),
          occurredAt: now,
        },
      });
    }
  });

  // Send "slot filled" notification to everyone who missed out
  try {
    const filledOffer = await prisma.smartOffer.findUnique({
      where: { id: offerId },
      select: {
        recipients: { select: { familyId: true, childId: true, smsThreadId: true, status: true } },
        appointment: { select: { startsAt: true, provider: { select: { name: true } } } },
        organizationId: true,
      },
    });
    if (filledOffer?.appointment) {
      const providerFirstName = (filledOffer.appointment.provider?.name ?? "Your provider").split(" ")[0];
      const filledBody = buildFilledSms(providerFirstName, filledOffer.appointment.startsAt);
      const missedOut = filledOffer.recipients.filter(r => r.childId !== body.childId && r.smsThreadId);
      await Promise.all(missedOut.map(r =>
        prisma.message.create({
          data: {
            threadId: r.smsThreadId!,
            direction: "OUTBOUND",
            body: filledBody,
            sentAt: now,
          },
        }).then(() =>
          prisma.smsThread.update({
            where: { id: r.smsThreadId! },
            data: { status: "resolved", lastUpdatedAt: now },
          })
        )
      ));
    }
  } catch { /* non-fatal — claim already succeeded */ }

  // Audit
  await audit({
    organizationId: offer.organizationId,
    action: "UPDATE",
    resourceType: "SmartOffer",
    resourceId: offerId,
    meta: { event: "claimed", childId: body.childId },
  });

  return NextResponse.json({ ok: true, claimedAt: now });
}
