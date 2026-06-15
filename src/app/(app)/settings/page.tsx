import { requireSession } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { SettingsTabs } from "./SettingsTabs";
import { headers } from "next/headers";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireSession({ allowedRoles: ["OWNER", "ADMIN"] });
  const h = headers();

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "READ",
    resourceType: "Settings",
    resourceId: ctx.organizationId,
    ipAddress: h.get("x-forwarded-for") ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  });

  const [org, billingTypes, rates, memberships, invites, auditLog, serviceTypes] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: {
        id: true, name: true, baseAddress: true,
        smartOffersEnabled: true, smartOfferDelayMin: true,
        lastMinuteTriggerHours: true, maxOfferRecipients: true,
      },
    }),
    prisma.billingType.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { sortOrder: "asc" },
      select: { id: true, label: true, defaultRatePerHour: true, includesTravel: true, active: true, color: true },
    }),
    prisma.rateSetting.findMany({
      where: { organizationId: ctx.organizationId },
      select: { discipline: true, gpPerHour: true },
    }),
    prisma.membership.findMany({
      where: { organizationId: ctx.organizationId, revokedAt: null },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { invitedAt: "asc" },
    }),
    prisma.inviteToken.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.auditLog.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { occurredAt: "desc" },
      take: 50,
      select: { id: true, action: true, resourceType: true, occurredAt: true },
    }),
    prisma.serviceType.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!org) return <div className="p-10 text-seed-500">Organization not found.</div>;

  const members = memberships.map((m) => ({
    id: m.user.id,
    membershipId: m.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    revokedAt: m.revokedAt,
    isSelf: m.user.id === ctx.userId,
  }));

  return (
    <div>
      <PageHeader eyebrow="Settings" title="Settings" subtitle={`${org.name} · ${ctx.role}`} />
      <div className="px-5 py-6 md:px-10 md:py-8">
        <SettingsTabs
          org={org}
          billingTypes={billingTypes}
          rates={rates}
          members={members}
          invites={invites}
          auditLog={auditLog}
          currentRole={ctx.role as Role}
          serviceTypes={serviceTypes}
        />
      </div>
    </div>
  );
}
