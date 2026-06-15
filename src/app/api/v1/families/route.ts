import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { geocodeAddress } from "@/lib/geocode";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id, acceptedAt: { not: null }, revokedAt: null },
    select: { organizationId: true, role: true },
  });
  if (!membership) return NextResponse.json({ error: "No membership" }, { status: 403 });
  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as {
    primaryContactName?: string; primaryContactPhone?: string; primaryContactEmail?: string;
    secondaryContactName?: string; secondaryContactPhone?: string;
    primaryContactOptIn?: boolean; secondaryContactOptIn?: boolean;
    homeAddress?: string; homeCity?: string; homeZip?: string; homeNeighborhood?: string;
    preferredLocation?: string; travelNotes?: string;
    billingTypeId?: string; travelRatePerMile?: number;
    rateOverrides?: Array<{ discipline: string; ratePerHour: number }>;
    child?: { firstName: string; lastName: string; ageYears?: number; birthDate?: string };
    authorizedServices?: Array<{ discipline: string; monthlyHours: number }>;
    parentAvailability?: Array<{ dayOfWeek: number; startMinutes: number; endMinutes: number }>;
  };

  if (!body.primaryContactName?.trim() || !body.primaryContactPhone?.trim()) {
    return NextResponse.json({ error: "Contact name and phone required" }, { status: 400 });
  }
  if (!body.child?.firstName || !body.child?.lastName) {
    return NextResponse.json({ error: "Child name required" }, { status: 400 });
  }

  // Resolve billing type
  let billingTypeId: string | null = null;
  if (body.billingTypeId) {
    const bt = await prisma.billingType.findFirst({
      where: { id: body.billingTypeId, organizationId: membership.organizationId },
    });
    if (bt) billingTypeId = bt.id;
  }

  // Calculate age from birthDate if provided
  let ageYears = body.child.ageYears ?? 5;
  let birthDate: Date | undefined = undefined;
  if (body.child.birthDate) {
    birthDate = new Date(body.child.birthDate);
    ageYears = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  }

  // Geocode home address if provided
  let homeLat: number | null = null;
  let homeLng: number | null = null;
  if (body.homeAddress) {
    const coords = await geocodeAddress(body.homeAddress, body.homeCity, body.homeZip);
    if (coords) { homeLat = coords.lat; homeLng = coords.lng; }
  }

  const family = await prisma.family.create({
    data: {
      organizationId: membership.organizationId,
      primaryContactName: body.primaryContactName.trim(),
      primaryContactPhone: body.primaryContactPhone.trim(),
      primaryContactEmail: body.primaryContactEmail?.trim() || null,
      secondaryContactName: body.secondaryContactName || null,
      secondaryContactPhone: body.secondaryContactPhone || null,
      primaryContactOptIn: body.primaryContactOptIn ?? true,
      secondaryContactOptIn: body.secondaryContactOptIn ?? true,
      homeAddress: body.homeAddress || null,
      homeCity: body.homeCity || null,
      homeZip: body.homeZip || null,
      homeNeighborhood: body.homeNeighborhood || null,
      homeLat,
      homeLng,
      preferredLocation: body.preferredLocation || "school",
      travelNotes: body.travelNotes || null,
      billingTypeId,
      travelRatePerMile: body.travelRatePerMile ?? null,
      children: {
        create: {
          organizationId: membership.organizationId,
          firstName: body.child.firstName.trim(),
          lastName: body.child.lastName.trim(),
          ageYears,
          birthDate: birthDate ?? null,
          authorizedServices: body.authorizedServices?.length
            ? { createMany: { data: body.authorizedServices.map(s => ({ discipline: s.discipline, monthlyHours: s.monthlyHours })) } }
            : undefined,
        },
      },
    },
    include: { children: true },
  });

  // Rate overrides
  if (body.rateOverrides?.length) {
    await prisma.familyRateOverride.createMany({
      data: body.rateOverrides.map(r => ({
        familyId: family.id,
        discipline: r.discipline,
        ratePerHour: r.ratePerHour,
      })),
    });
  }

  // Availability windows
  if (body.parentAvailability?.length && family.children[0]) {
    await prisma.parentAvailability.createMany({
      data: body.parentAvailability.map(w => ({
        childId: family.children[0].id,
        dayOfWeek: w.dayOfWeek,
        startMinutes: w.startMinutes,
        endMinutes: w.endMinutes,
      })),
    });
  }

  await audit({
    organizationId: membership.organizationId,
    userId: session.user.id,
    action: "CREATE",
    resourceType: "Family",
    resourceId: family.id,
  });

  return NextResponse.json({ ok: true, familyId: family.id });
}
