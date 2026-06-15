"use server";

import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateProvider(providerId: string, data: {
  name: string;
  credentials?: string;
  title?: string;
  discipline: string;
  bilingual: boolean;
  weeklyTargetHours: number;
  bufferMinutes: number;
  startAddress?: string;
  billingRatePerHour?: number | null;
}) {
  const ctx = await requireSession({ allowedRoles: ["OWNER", "ADMIN"] });

  const provider = await prisma.provider.findFirst({
    where: { id: providerId, organizationId: ctx.organizationId },
  });
  if (!provider) throw new Error("Provider not found");

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      name: data.name,
      credentials: data.credentials || null,
      title: data.title || null,
      discipline: data.discipline,
      bilingual: data.bilingual,
      weeklyTargetHours: data.weeklyTargetHours,
      bufferMinutes: data.bufferMinutes,
      startAddress: data.startAddress || null,
      billingRatePerHour: data.billingRatePerHour ?? null,
    },
  });

  revalidatePath("/providers");
}

/** Link an existing admin/owner user to a provider record so they can use /me */
export async function linkProviderToUser(providerId: string, userId: string) {
  const ctx = await requireSession({ allowedRoles: ["OWNER", "ADMIN"] });

  // Verify provider belongs to this org
  const provider = await prisma.provider.findFirst({
    where: { id: providerId, organizationId: ctx.organizationId },
  });
  if (!provider) throw new Error("Provider not found");

  // Verify user has a membership in this org
  const membership = await prisma.membership.findFirst({
    where: { userId, organizationId: ctx.organizationId, revokedAt: null },
  });
  if (!membership) throw new Error("User not in this organization");

  // Unlink any existing membership that already points to this provider
  await prisma.membership.updateMany({
    where: { providerId, organizationId: ctx.organizationId },
    data: { providerId: null },
  });

  // Link the new membership
  await prisma.membership.update({
    where: { id: membership.id },
    data: { providerId },
  });

  revalidatePath("/providers");
}

/** Remove the user↔provider link */
export async function unlinkProviderFromUser(providerId: string) {
  const ctx = await requireSession({ allowedRoles: ["OWNER", "ADMIN"] });

  await prisma.membership.updateMany({
    where: { providerId, organizationId: ctx.organizationId },
    data: { providerId: null },
  });

  revalidatePath("/providers");
}
