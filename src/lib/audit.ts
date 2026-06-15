// HIPAA §164.312(b) — audit controls.
//
// Every PHI read, write, login, logout, and outbound message MUST be
// recorded. Records are append-only — never updated, never deleted by
// code. Retention floor: 6 years (HIPAA Security Rule §164.530(j)).
//
// Usage from a server component or server action:
//
//   const session = await auth();
//   const headersList = headers();
//   await audit({
//     organizationId: session?.user.organizationId,
//     userId: session?.user.id,
//     action: "READ",
//     resourceType: "Child",
//     resourceId: child.id,
//     ipAddress: headersList.get("x-forwarded-for"),
//     userAgent: headersList.get("user-agent"),
//   });

import { prisma } from "./db";
import type { AuditAction } from "./types";

export interface AuditEvent {
  organizationId?: string | null;
  userId?: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  // Extra context — kept minimal. NEVER put PHI here.
  // Acceptable: filter params, count summaries. Not acceptable: child names,
  // session bodies, etc.
  meta?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function audit(event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: event.organizationId ?? null,
        userId: event.userId ?? null,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId ?? null,
        meta: event.meta ? JSON.stringify(event.meta) : null,
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
      },
    });
  } catch (err) {
    // Audit failure is itself a HIPAA-relevant event — log loudly to the
    // application logs (which Vercel/CloudWatch will capture). We do NOT
    // throw, because audit-log failure shouldn't break user-facing flows.
    // eslint-disable-next-line no-console
    console.error("[AUDIT FAILURE]", err, event);
  }
}

// Convenience wrapper for the common "I read a record" pattern.
export async function auditRead(opts: {
  organizationId?: string | null;
  userId?: string | null;
  resourceType: string;
  resourceId: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  return audit({ ...opts, action: "READ" });
}
