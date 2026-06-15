// Invite token system — no email required.
// Admin generates a signed link → copies it → sends via any channel.
// Recipient visits /join/:token → signs in → membership created.

import { prisma } from "./db";
import type { Role } from "./types";
import { audit } from "./audit";

const INVITE_TTL_HOURS = 72;

export async function createInviteToken(opts: {
  organizationId: string;
  createdByUserId: string;
  role: Role;
  note?: string;
}): Promise<string> {
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000);
  const invite = await prisma.inviteToken.create({
    data: {
      organizationId: opts.organizationId,
      createdByUserId: opts.createdByUserId,
      role: opts.role,
      note: opts.note ?? null,
      expiresAt,
    },
  });

  await audit({
    organizationId: opts.organizationId,
    userId: opts.createdByUserId,
    action: "CREATE",
    resourceType: "InviteToken",
    resourceId: invite.id,
    meta: { role: opts.role, expiresAt: expiresAt.toISOString() },
  });

  return invite.token;
}

export async function claimInviteToken(token: string, userId: string): Promise<{
  ok: boolean;
  error?: string;
  organizationId?: string;
  role?: Role;
}> {
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    select: {
      id: true,
      organizationId: true,
      role: true,
      note: true,
      claimedAt: true,
      expiresAt: true,
    },
  });

  if (!invite) return { ok: false, error: "Invite link not found or already used." };
  if (invite.claimedAt) return { ok: false, error: "This invite has already been claimed." };
  if (invite.expiresAt < new Date()) return { ok: false, error: "This invite has expired. Ask an admin to send a new one." };

  // Check if user is already in the org
  const existing = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId: invite.organizationId } },
  });
  if (existing) return { ok: false, error: "You already belong to this organization." };

  // Parse providerId from note JSON if present
  let linkedProviderId: string | undefined;
  let providerName: string | undefined;
  try {
    if (invite.note?.startsWith("{")) {
      const parsed = JSON.parse(invite.note) as { providerId?: string };
      if (parsed.providerId) {
        linkedProviderId = parsed.providerId;
      }
    }
  } catch { /* plain text note */ }

  // If we have a linked provider, get the user's name to update the provider record
  if (linkedProviderId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    providerName = user?.name ?? user?.email ?? undefined;
  }

  // Claim it
  await prisma.$transaction(async (tx) => {
    await tx.inviteToken.update({
      where: { id: invite.id },
      data: { claimedByUserId: userId, claimedAt: new Date() },
    });
    await tx.membership.create({
      data: {
        userId,
        organizationId: invite.organizationId,
        role: invite.role,
        acceptedAt: new Date(),
        providerId: linkedProviderId ?? undefined,
      },
    });
    // Update provider name if linked
    if (linkedProviderId && providerName) {
      await tx.provider.update({
        where: { id: linkedProviderId },
        data: { name: providerName },
      });
    }
  });

  await audit({
    organizationId: invite.organizationId,
    userId,
    action: "CREATE",
    resourceType: "Membership",
    resourceId: invite.id,
    meta: { role: invite.role, via: "invite_token" },
  });

  return { ok: true, organizationId: invite.organizationId, role: invite.role as Role };
}

export function inviteUrl(token: string): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3001";
  return `${base}/join/${token}`;
}
