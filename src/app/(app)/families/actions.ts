"use server";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { geocodeAddress } from "@/lib/geocode";

export async function updateFamily(familyId: string, data: {
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail?: string;
  secondaryContactName?: string;
  secondaryContactPhone?: string;
  primaryContactOptIn?: boolean;
  secondaryContactOptIn?: boolean;
  homeAddress?: string;
  homeCity?: string;
  homeZip?: string;
  homeNeighborhood?: string;
  preferredLocation?: string;
  travelNotes?: string;
  billingTypeId?: string;
  travelRatePerMile?: number | null;
  rateOverrides?: Array<{discipline: string; ratePerHour: number}>;
  child?: {
    id: string;
    firstName: string;
    lastName: string;
    birthDate?: string;
    ageYears?: number;
  };
  authorizedServices?: Array<{discipline: string; monthlyHours: number}>;
}) {
  const ctx = await requireSession({ allowedRoles: ["OWNER", "ADMIN"] });

  // Verify family belongs to this org
  const family = await prisma.family.findFirst({
    where: { id: familyId, organizationId: ctx.organizationId },
  });
  if (!family) throw new Error("Family not found");

  // Geocode address separately to avoid spread issues in Prisma data
  let homeLat: number | null = null;
  let homeLng: number | null = null;
  if (data.homeAddress) {
    try {
      const coords = await geocodeAddress(data.homeAddress, data.homeCity ?? "", data.homeZip ?? "");
      if (coords) { homeLat = coords.lat; homeLng = coords.lng; }
    } catch { /* non-fatal */ }
  }

  // Update family
  await prisma.family.update({
    where: { id: familyId },
    data: {
      primaryContactName: data.primaryContactName,
      primaryContactPhone: data.primaryContactPhone,
      primaryContactEmail: data.primaryContactEmail ?? null,
      secondaryContactName: data.secondaryContactName ?? null,
      secondaryContactPhone: data.secondaryContactPhone ?? null,
      primaryContactOptIn: data.primaryContactOptIn ?? true,
      secondaryContactOptIn: data.secondaryContactOptIn ?? true,
      homeAddress: data.homeAddress ?? null,
      homeCity: data.homeCity ?? null,
      homeZip: data.homeZip ?? null,
      homeNeighborhood: data.homeNeighborhood ?? null,
      homeLat: data.homeAddress ? homeLat : undefined,
      homeLng: data.homeAddress ? homeLng : undefined,
      preferredLocation: data.preferredLocation ?? null,
      travelNotes: data.travelNotes ?? null,
      billingTypeId: data.billingTypeId ?? null,
      travelRatePerMile: data.travelRatePerMile ?? null,
    },
  });

  // Update rate overrides — delete existing, recreate
  if (data.rateOverrides !== undefined) {
    await prisma.familyRateOverride.deleteMany({ where: { familyId } });
    if (data.rateOverrides.length > 0) {
      await prisma.familyRateOverride.createMany({
        data: data.rateOverrides.map(r => ({ familyId, discipline: r.discipline, ratePerHour: r.ratePerHour })),
      });
    }
  }

  // Update child if provided
  if (data.child) {
    const ageYears = data.child.birthDate
      ? Math.floor((Date.now() - new Date(data.child.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : (data.child.ageYears ?? 5);
    await prisma.child.update({
      where: { id: data.child.id },
      data: {
        firstName: data.child.firstName,
        lastName: data.child.lastName,
        ageYears,
        birthDate: data.child.birthDate ? new Date(data.child.birthDate) : undefined,
      },
    });
  }

  // Update authorized services if provided
  if (data.authorizedServices && data.child?.id) {
    for (const svc of data.authorizedServices) {
      await prisma.authorizedService.upsert({
        where: { childId_discipline: { childId: data.child.id, discipline: svc.discipline } },
        update: { monthlyHours: svc.monthlyHours },
        create: { childId: data.child.id, discipline: svc.discipline, monthlyHours: svc.monthlyHours },
      });
    }
    // Remove services not in the new list
    await prisma.authorizedService.deleteMany({
      where: {
        childId: data.child.id,
        discipline: { notIn: data.authorizedServices.map(s => s.discipline) },
      },
    });
  }

  revalidatePath("/families");
}
