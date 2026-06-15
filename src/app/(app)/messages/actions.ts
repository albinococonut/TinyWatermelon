"use server";
import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function sendReply(threadId: string, body: string) {
  const ctx = await requireSession();

  const thread = await prisma.smsThread.findFirst({
    where: { id: threadId, organizationId: ctx.organizationId },
  });
  if (!thread) throw new Error("Thread not found");

  const now = new Date();
  await prisma.message.create({
    data: { threadId, direction: "OUTBOUND", body, sentAt: now },
  });
  await prisma.smsThread.update({
    where: { id: threadId },
    data: { status: "awaiting_reply", lastUpdatedAt: now },
  });

  revalidatePath("/messages");
}
