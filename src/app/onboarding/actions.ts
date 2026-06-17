"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_BILLING_TYPES } from "@/lib/types";
import { audit } from "@/lib/audit";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base || "my-org";
  const existing = await prisma.organization.findUnique({ where: { slug: candidate } });
  if (!existing) return candidate;
  // Append a short random suffix to avoid conflicts
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${candidate.slice(0, 44)}-${suffix}`;
}

export async function createOrg(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const orgName = String(formData.get("orgName") ?? "").trim();
  const yourName = String(formData.get("yourName") ?? "").trim();

  if (!orgName) return;

  // Prevent double-create if they already have a membership
  const existing = await prisma.membership.findFirst({
    where: { userId, acceptedAt: { not: null }, revokedAt: null },
  });
  if (existing) redirect("/baa-accept");

  const slug = await uniqueSlug(toSlug(orgName));

  const org = await prisma.organization.create({
    data: { name: orgName, slug },
  });

  // Seed default billing types
  await prisma.billingType.createMany({
    data: DEFAULT_BILLING_TYPES.map((bt) => ({
      organizationId: org.id,
      label: bt.label,
      includesTravel: bt.includesTravel,
    })),
  });

  // Create OWNER membership, immediately accepted
  await prisma.membership.create({
    data: {
      userId,
      organizationId: org.id,
      role: "OWNER",
      invitedAt: new Date(),
      acceptedAt: new Date(),
    },
  });

  // Update user's display name if provided
  if (yourName) {
    await prisma.user.update({ where: { id: userId }, data: { name: yourName } });
  }

  await audit({
    userId,
    organizationId: org.id,
    action: "CREATE",
    resourceType: "Organization",
    resourceId: org.id,
    meta: { orgName, slug } as Record<string, unknown>,
  });

  redirect("/baa-accept");
}
