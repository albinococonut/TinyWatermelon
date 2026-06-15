// Prisma client — singleton pattern to avoid exhausting connections
// during dev hot-reload. Single source of truth for DB access.
//
// IMPORTANT: never bypass this client. All PHI reads should go through
// the auditedDb wrapper (see lib/audited.ts) which logs the access.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
