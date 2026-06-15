// POST /api/v1/offers — send a Smart Family Offer for an open slot.
// Protected by requireSession (COORDINATOR+ required in middleware).

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSmartOffer } from "@/lib/offers";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    slotId?: string;
    lastMinute?: boolean;
  };
  if (!body.slotId) {
    return NextResponse.json({ error: "slotId required" }, { status: 400 });
  }

  // Resolve orgId from the user's active membership
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, acceptedAt: { not: null }, revokedAt: null },
    select: { organizationId: true, role: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "No organization membership" }, { status: 403 });
  }
  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const result = await sendSmartOffer(
    body.slotId,
    membership.organizationId,
    session.user.id,
    { lastMinute: body.lastMinute },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await audit({
    organizationId: membership.organizationId,
    userId: session.user.id,
    action: "SEND_SMS",
    resourceType: "SmartOffer",
    resourceId: result.blastId,
    meta: { slotId: body.slotId, recipientCount: result.recipientCount },
  });

  return NextResponse.json({ ok: true, offerId: result.blastId, recipientCount: result.recipientCount });
}
