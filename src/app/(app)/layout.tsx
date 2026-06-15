// Layout wrapping all protected app pages.
// Enforces auth via requireSession() and provides the AppShell.

import { requireSession } from "@/lib/rbac";
import { AppShell } from "@/components/AppShell";
import { IdleTimeout } from "@/components/IdleTimeout";
import { signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireSession();

  // Count threads with unread inbound messages
  const threads = await prisma.smsThread.findMany({
    where: { organizationId: ctx.organizationId },
    select: {
      lastAdminReadAt: true,
      messages: {
        where: { direction: "INBOUND" },
        select: { sentAt: true },
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });
  const unreadCount = threads.filter(t => {
    const lastInbound = t.messages[0];
    if (!lastInbound) return false;
    if (!t.lastAdminReadAt) return true;
    return lastInbound.sentAt > t.lastAdminReadAt;
  }).length;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <AppShell
      orgName={ctx.organizationName}
      role={ctx.role}
      providerId={ctx.providerId}
      signOutAction={handleSignOut}
      messagesUnread={unreadCount}
    >
      {/* HIPAA §164.312(a)(2)(iii) — 15-min idle auto-logoff */}
      <IdleTimeout signOutAction={handleSignOut} />
      {children}
    </AppShell>
  );
}
