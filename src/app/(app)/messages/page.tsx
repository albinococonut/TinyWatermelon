import { requireSession, providerScope } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import Link from "next/link";
import { ThreadReplyForm } from "./ThreadReplyForm";

export const dynamic = "force-dynamic";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtRelTime(d: Date): string {
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  awaiting_reply: { label: "Awaiting reply", cls: "bg-amber-50 text-amber-700" },
  accepted:       { label: "Accepted",        cls: "bg-rind-50 text-rind-700" },
  declined:       { label: "Declined",        cls: "bg-seed-100 text-seed-700" },
  resolved:       { label: "Resolved",        cls: "bg-rind-50 text-rind-700" },
};

// ─── thread list item ─────────────────────────────────────────────────────────

type ThreadWithDetails = {
  id: string;
  topic: string;
  status: string;
  lastUpdatedAt: Date;
  lastAdminReadAt: Date | null;
  family: { primaryContactName: string; primaryContactPhone: string };
  messages: { id: string; direction: string; body: string; sentAt: Date }[];
};

function isUnread(thread: ThreadWithDetails): boolean {
  const inbound = thread.messages.filter(m => m.direction === "INBOUND");
  if (inbound.length === 0) return false;
  if (!thread.lastAdminReadAt) return true;
  return inbound.some(m => m.sentAt > thread.lastAdminReadAt!);
}

function ThreadItem({
  thread,
  isSelected,
  unread,
}: {
  thread: ThreadWithDetails;
  isSelected: boolean;
  unread: boolean;
}) {
  const lastMsg = thread.messages[thread.messages.length - 1];
  const initials = thread.family.primaryContactName
    .split(/\s+/)
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/messages?thread=${thread.id}`}
      className={`flex items-center gap-3 px-4 py-3.5 border-b border-seed-100 hover:bg-seed-50 transition ${
        isSelected ? "bg-melon-50" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold ${
          unread ? "bg-melon-500 text-white" : "bg-seed-200 text-seed-700"
        }`}
      >
        {initials}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={`text-[15px] truncate ${
              unread ? "font-bold text-seed-900" : "font-semibold text-seed-700"
            }`}
          >
            {thread.family.primaryContactName}
          </span>
          <span className="text-[11px] shrink-0 text-seed-400">
            {fmtRelTime(new Date(thread.lastUpdatedAt))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[13px] truncate text-seed-500">
            {lastMsg?.direction === "OUTBOUND" ? "You: " : ""}
            {lastMsg?.body ?? "No messages yet"}
          </span>
          {unread && (
            <span className="shrink-0 h-2.5 w-2.5 rounded-full bg-melon-500" />
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  parentName,
}: {
  msg: ThreadWithDetails["messages"][number];
  parentName: string;
}) {
  const isOut = msg.direction === "OUTBOUND";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`max-w-[75%] ${isOut ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-[14px] leading-snug whitespace-pre-line ${
            isOut
              ? "rounded-br-md bg-seed-900 text-white"
              : "rounded-bl-md bg-seed-100 text-seed-900"
          }`}
        >
          {msg.body}
        </div>
        <span className="mt-0.5 text-[11px] text-seed-400 px-1">
          {isOut ? "You" : parentName.split(" ")[0]} &middot;{" "}
          {new Date(msg.sentAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: { thread?: string };
}) {
  const ctx = await requireSession();
  const h = headers();
  const scope = providerScope(ctx);

  await audit({
    organizationId: ctx.organizationId,
    userId: ctx.userId,
    action: "READ",
    resourceType: "SmsThread",
    ipAddress: h.get("x-forwarded-for") ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  });

  let familyFilter: { familyId?: { in: string[] } } = {};
  if (scope.providerId) {
    const appts = await prisma.appointment.findMany({
      where: {
        organizationId: ctx.organizationId,
        providerId: scope.providerId,
        childId: { not: null },
      },
      select: { childId: true },
      distinct: ["childId"],
    });
    const children = await prisma.child.findMany({
      where: { id: { in: appts.map(a => a.childId as string) } },
      select: { familyId: true },
      distinct: ["familyId"],
    });
    const ids = children.map(c => c.familyId);
    familyFilter = { familyId: { in: ids.length ? ids : ["__none__"] } };
  }

  const threads = await prisma.smsThread.findMany({
    where: { organizationId: ctx.organizationId, ...familyFilter },
    include: {
      family: { select: { primaryContactName: true, primaryContactPhone: true } },
      messages: { orderBy: { sentAt: "asc" } },
    },
    orderBy: { lastUpdatedAt: "desc" },
    take: 100,
  });

  const selectedThreadId = searchParams?.thread;

  // Mark thread as read when opened
  if (selectedThreadId) {
    const belongs = threads.some(t => t.id === selectedThreadId);
    if (belongs) {
      await prisma.smsThread.update({
        where: { id: selectedThreadId },
        data: { lastAdminReadAt: new Date() },
      });
    }
  }

  const selectedThread = threads.find(t => t.id === selectedThreadId) ?? null;

  return (
    <div className="flex h-[calc(100dvh-57px)] md:h-screen overflow-hidden">
      {/* ── Conversation list ── */}
      <div
        className={`${
          selectedThreadId ? "hidden md:flex" : "flex"
        } w-full md:w-80 lg:w-96 flex-col border-r border-seed-200 bg-white`}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-seed-200 px-5 py-4">
          <h1 className="text-[18px] font-bold text-seed-900">Family Messages</h1>
          <p className="mt-0.5 text-[12px] text-seed-400">
            {threads.length} thread{threads.length === 1 ? "" : "s"} &middot; PHI-free outbound
          </p>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="px-5 py-10 text-center text-[14px] text-seed-400">
              No threads yet. Send a Smart Family Offer from the Recovery Queue to start a conversation.
            </div>
          ) : (
            threads.map(t => (
              <ThreadItem
                key={t.id}
                thread={t}
                isSelected={t.id === selectedThreadId}
                unread={isUnread(t)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Thread detail ── */}
      <div
        className={`${
          selectedThreadId ? "flex" : "hidden md:flex"
        } flex-1 flex-col min-w-0`}
      >
        {selectedThread ? (
          <>
            {/* Thread header */}
            <div className="shrink-0 flex items-center gap-3 border-b border-seed-200 bg-white px-4 py-3.5">
              {/* Back button (mobile) */}
              <Link
                href="/messages"
                className="md:hidden flex h-8 w-8 items-center justify-center rounded-full hover:bg-seed-100 text-seed-600 transition"
                aria-label="Back to threads"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-seed-200 text-[13px] font-semibold text-seed-700">
                {selectedThread.family.primaryContactName
                  .split(/\s+/)
                  .map((p: string) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-bold text-seed-900 truncate">
                  {selectedThread.family.primaryContactName}
                </div>
                <div className="text-[12px] text-seed-400 truncate">
                  {selectedThread.family.primaryContactPhone} &middot; {selectedThread.topic}
                </div>
              </div>
              {/* Status badge */}
              {(() => {
                const st = STATUS_PILL[selectedThread.status] ?? STATUS_PILL.resolved;
                return (
                  <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${st.cls}`}>
                    {st.label}
                  </span>
                );
              })()}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-seed-50">
              {selectedThread.messages.length === 0 ? (
                <div className="text-center text-[14px] text-seed-400 mt-12">
                  No messages yet in this thread.
                </div>
              ) : (
                selectedThread.messages.map(m => (
                  <MessageBubble
                    key={m.id}
                    msg={m}
                    parentName={selectedThread.family.primaryContactName}
                  />
                ))
              )}
            </div>

            {/* Reply form */}
            <ThreadReplyForm threadId={selectedThread.id} />
          </>
        ) : (
          /* Empty state when no thread selected */
          <div className="flex flex-1 flex-col items-center justify-center bg-seed-50 text-center px-8">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-seed-100">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-seed-400">
                <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H6.5A2.5 2.5 0 0 1 4 14.5v-8z" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-seed-700">Select a conversation</p>
            <p className="mt-1 text-[13px] text-seed-400">
              Choose a thread from the list to view the full conversation.
            </p>
            <div className="mt-4 rounded-xl bg-rind-50 border border-rind-100 px-4 py-3 max-w-xs text-left">
              <p className="text-[12px] text-rind-700 font-semibold">HIPAA reminder</p>
              <p className="mt-0.5 text-[11px] text-rind-600">
                Keep outbound texts PHI-free — no diagnoses, dates of birth, or clinical details.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
