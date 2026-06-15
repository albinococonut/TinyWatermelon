"use server";

import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createInviteToken, inviteUrl } from "@/lib/invite";
import { revalidatePath } from "next/cache";
import type { Role } from "@/lib/types";
import { ROLES } from "@/lib/types";

// ─── Guard: admin+ only ────────────────────────────────────────────────────────
async function adminCtx() {
  return requireSession({ allowedRoles: ["OWNER", "ADMIN"] });
}

// ─── Org profile ───────────────────────────────────────────────────────────────
export async function actionUpdateOrg(formData: FormData) {
  const ctx = await adminCtx();
  const name = String(formData.get("name") ?? "").trim();
  const baseAddress = String(formData.get("baseAddress") ?? "").trim();
  if (!name) return { ok: false, error: "Name required" };
  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { name, baseAddress: baseAddress || null },
  });
  await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "UPDATE", resourceType: "Organization", resourceId: ctx.organizationId });
  revalidatePath("/settings");
  return { ok: true };
}

// ─── Billing types ─────────────────────────────────────────────────────────────
export async function actionCreateBillingType(formData: FormData) {
  const ctx = await adminCtx();
  const label = String(formData.get("label") ?? "").trim();
  const defaultRatePerHour = parseFloat(String(formData.get("defaultRatePerHour") ?? "0")) || null;
  const includesTravel = formData.get("includesTravel") === "on";
  const color = String(formData.get("color") ?? "#6B7280").trim() || "#6B7280";
  if (!label) return { ok: false, error: "Label required" };
  const count = await prisma.billingType.count({ where: { organizationId: ctx.organizationId } });
  await prisma.billingType.create({
    data: { organizationId: ctx.organizationId, label, defaultRatePerHour, includesTravel, color, sortOrder: count },
  });
  await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "CREATE", resourceType: "BillingType", meta: { label } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function actionUpdateBillingType(id: string, formData: FormData) {
  const ctx = await adminCtx();
  const label = String(formData.get("label") ?? "").trim();
  const defaultRatePerHour = parseFloat(String(formData.get("defaultRatePerHour") ?? "0")) || null;
  const includesTravel = formData.get("includesTravel") === "on";
  const active = formData.get("active") !== "false";
  await prisma.billingType.updateMany({
    where: { id, organizationId: ctx.organizationId },
    data: { label, defaultRatePerHour, includesTravel, active },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function actionDeleteBillingType(id: string) {
  const ctx = await adminCtx();
  await prisma.billingType.deleteMany({ where: { id, organizationId: ctx.organizationId } });
  revalidatePath("/settings");
  return { ok: true };
}

// ─── Rates ─────────────────────────────────────────────────────────────────────
export async function actionUpdateRates(formData: FormData) {
  const ctx = await adminCtx();
  const disciplines = ["OT", "PT", "SLP", "MT", "ABA"] as const;
  for (const d of disciplines) {
    const val = parseFloat(String(formData.get(d) ?? ""));
    if (!Number.isFinite(val) || val < 0) continue;
    await prisma.rateSetting.upsert({
      where: { organizationId_discipline: { organizationId: ctx.organizationId, discipline: d } },
      update: { gpPerHour: val },
      create: { organizationId: ctx.organizationId, discipline: d, gpPerHour: val },
    });
  }
  await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "UPDATE", resourceType: "RateSetting" });
  revalidatePath("/settings");
  return { ok: true };
}

// ─── Smart Offer config ────────────────────────────────────────────────────────
export async function actionUpdateSmartOffer(formData: FormData) {
  const ctx = await adminCtx();
  const enabled = formData.get("enabled") === "on";
  const delayMin = parseInt(String(formData.get("delayMin") ?? "5"), 10) || 5;
  const lastMinuteHours = parseFloat(String(formData.get("lastMinuteHours") ?? "3")) || 3;
  const maxRecipients = parseInt(String(formData.get("maxRecipients") ?? "8"), 10) || 8;
  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { smartOffersEnabled: enabled, smartOfferDelayMin: delayMin, lastMinuteTriggerHours: lastMinuteHours, maxOfferRecipients: maxRecipients },
  });
  revalidatePath("/settings");
  return { ok: true };
}

// ─── Users & Roles ─────────────────────────────────────────────────────────────
export async function actionChangeRole(membershipId: string, newRole: string) {
  const ctx = await adminCtx();
  if (!ROLES.includes(newRole as Role)) return { ok: false, error: "Invalid role" };
  // OWNER can change anything. ADMIN cannot promote to OWNER.
  if (ctx.role !== "OWNER" && newRole === "OWNER") return { ok: false, error: "Only OWNER can assign OWNER role." };

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: ctx.organizationId },
  });
  if (!membership) return { ok: false, error: "Member not found." };

  await prisma.membership.update({ where: { id: membershipId }, data: { role: newRole } });
  await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "UPDATE", resourceType: "Membership", resourceId: membershipId, meta: { newRole } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function actionRevokeMember(membershipId: string) {
  const ctx = await adminCtx();
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, organizationId: ctx.organizationId },
  });
  if (!membership) return { ok: false, error: "Member not found." };
  if (membership.userId === ctx.userId) return { ok: false, error: "Cannot revoke your own membership." };

  await prisma.membership.update({ where: { id: membershipId }, data: { revokedAt: new Date() } });
  await audit({ organizationId: ctx.organizationId, userId: ctx.userId, action: "DELETE", resourceType: "Membership", resourceId: membershipId });
  revalidatePath("/settings");
  return { ok: true };
}

export async function actionCreateInvite(formData: FormData) {
  const ctx = await adminCtx();
  const role = String(formData.get("role") ?? "ADMIN");
  const userNote = String(formData.get("note") ?? "").trim() || undefined;
  if (!ROLES.includes(role as Role)) return { ok: false, error: "Invalid role", url: null };
  if (ctx.role !== "OWNER" && role === "OWNER") return { ok: false, error: "Only OWNER can invite OWNER.", url: null };

  const alsoProvider = formData.get("alsoProvider") === "true" && role === "ADMIN";
  let note: string | undefined = userNote;

  if (alsoProvider) {
    const discipline = String(formData.get("discipline") ?? "OT");
    const credentials = String(formData.get("credentials") ?? "").trim() || null;
    const providerTitle = String(formData.get("providerTitle") ?? "").trim() || null;

    // Create the provider record immediately; name will be updated when invite is claimed
    const provider = await prisma.provider.create({
      data: {
        organizationId: ctx.organizationId,
        name: userNote ?? "Pending",
        discipline,
        credentials,
        title: providerTitle,
      },
    });

    // Store provider ID in note as JSON so the join page can link it
    note = JSON.stringify({ userNote: userNote ?? null, providerId: provider.id, discipline });
  }

  const token = await createInviteToken({ organizationId: ctx.organizationId, createdByUserId: ctx.userId, role: role as Role, note });
  revalidatePath("/settings");
  return { ok: true, url: inviteUrl(token), error: null };
}

// ─── Service types ─────────────────────────────────────────────────────────────
export async function actionCreateServiceType(fd: FormData) {
  const ctx = await adminCtx();
  const code = String(fd.get("code") ?? "").trim().toUpperCase().replace(/\s/g, "_");
  const label = String(fd.get("label") ?? "").trim();
  const nickname = fd.get("nickname")?.toString().trim().toUpperCase().slice(0, 4) || null;
  if (!code || !label) return { ok: false, error: "Code and label required" };
  try {
    await prisma.serviceType.create({
      data: { organizationId: ctx.organizationId, code, label, nickname, active: true, sortOrder: 99 },
    });
    revalidatePath("/settings");
    return { ok: true };
  } catch {
    return { ok: false, error: "Code already exists" };
  }
}

export async function actionUpdateServiceType(id: string, data: { label?: string; active?: boolean }) {
  const ctx = await adminCtx();
  const st = await prisma.serviceType.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!st) return { ok: false, error: "Not found" };
  await prisma.serviceType.update({ where: { id }, data });
  revalidatePath("/settings");
  return { ok: true };
}

export async function actionDeleteServiceType(id: string) {
  const ctx = await adminCtx();
  const st = await prisma.serviceType.findFirst({ where: { id, organizationId: ctx.organizationId } });
  if (!st) return;
  await prisma.serviceType.delete({ where: { id } });
  revalidatePath("/settings");
}

export async function actionRevokeInvite(inviteId: string) {
  const ctx = await adminCtx();
  await prisma.inviteToken.updateMany({
    where: { id: inviteId, organizationId: ctx.organizationId },
    data: { expiresAt: new Date() }, // expire it immediately
  });
  revalidatePath("/settings");
  return { ok: true };
}
