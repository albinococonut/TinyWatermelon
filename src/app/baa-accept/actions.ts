"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function acceptBaa(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const signerName = String(formData.get("signerName") ?? "").trim();
  if (!signerName) return;

  const userId = session.user.id;

  const membership = await prisma.membership.findFirst({
    where: { userId, acceptedAt: { not: null }, revokedAt: null },
    select: { organizationId: true },
    orderBy: { invitedAt: "desc" },
  });
  if (!membership) redirect("/onboarding");

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await prisma.organization.update({
    where: { id: membership.organizationId },
    data: {
      baaSignedAt: new Date(),
      baaSignedByUserId: userId,
      baaSignedIp: ip,
      baaVersion: "2026-06-15",
    },
  });

  await audit({
    userId,
    organizationId: membership.organizationId,
    action: "BAA_ACCEPTED",
    resourceType: "Organization",
    resourceId: membership.organizationId,
    meta: { signerName, baaVersion: "2026-06-15", ip } as Record<string, unknown>,
  });

  redirect("/dashboard");
}
