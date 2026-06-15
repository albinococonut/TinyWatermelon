import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { mondayOfWeek, makeWeekDays, fetchWeekAppts } from "@/lib/schedule";
import { cancelAppointment, completeAppointment, uncompleteAppointment } from "./actions";
import { currentMonthBounds } from "@/lib/buckets";
import { ProviderPageClient } from "./ProviderPageClient";

export const dynamic = "force-dynamic";

export default async function MyDayPage({ searchParams }: { searchParams?: { week?: string; tab?: string; day?: string } }) {
  const ctx = await requireSession();
  const weekOffset = parseInt(searchParams?.week ?? "0", 10) || 0;
  const tab = searchParams?.tab ?? "schedule";
  const initialDayIndex = searchParams?.day !== undefined ? parseInt(searchParams.day, 10) : undefined;

  // Resolve which provider to show
  let providerId = ctx.providerId;
  if (!providerId && (ctx.role === "OWNER" || ctx.role === "ADMIN")) {
    const first = await prisma.provider.findFirst({
      where: { organizationId: ctx.organizationId, deletedAt: null },
      select: { id: true },
    });
    providerId = first?.id ?? null;
  }

  if (!providerId) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[15px] text-seed-500">
        No provider account linked. Ask an admin to connect your provider profile.
      </div>
    );
  }

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { name: true, credentials: true, discipline: true },
  });

  const monday = mondayOfWeek(weekOffset);
  const weekDays = makeWeekDays(monday);
  const byDate = await fetchWeekAppts({ organizationId: ctx.organizationId, monday, providerId });
  const total = Object.values(byDate).flat().length;
  const todayAppts = byDate[new Date().toISOString().slice(0, 10)] ?? [];
  const doneCount = todayAppts.filter(a => a.status === "COMPLETED" || a.status === "FILLED_MAKEUP").length;

  const prevHref = `/me?week=${weekOffset - 1}&tab=${tab}`;
  const nextHref = `/me?week=${weekOffset + 1}&tab=${tab}`;

  // ─── My Families tab ──────────────────────────────────────────────────────
  type ChildInfo = {
    id: string; firstName: string; lastName: string;
    family: { primaryContactName: string; primaryContactPhone: string; secondaryContactName: string | null; secondaryContactPhone: string | null; homeNeighborhood: string | null; } | null;
    authorizedServices: { discipline: string; monthlyHours: number }[];
  };
  let myChildren: ChildInfo[] = [];
  let siblingsByChildId: Record<string, { name: string; discipline: string }[]> = {};

  if (tab === "families") {
    const { start: monthStart, end: monthEnd } = currentMonthBounds(new Date());
    myChildren = await prisma.child.findMany({
      where: {
        organizationId: ctx.organizationId,
        appointments: { some: { providerId, startsAt: { gte: monthStart, lte: monthEnd }, status: { notIn: ["CANCELLED_FAMILY", "CANCELLED_PROVIDER"] } } },
      },
      include: {
        family: { select: { primaryContactName: true, primaryContactPhone: true, secondaryContactName: true, secondaryContactPhone: true, homeNeighborhood: true } },
        authorizedServices: { where: { deletedAt: null }, select: { discipline: true, monthlyHours: true } },
      },
      distinct: ["id"],
    });

    const childIdList = myChildren.map(c => c.id);
    if (childIdList.length > 0) {
      const siblingAppts = await prisma.appointment.findMany({
        where: { organizationId: ctx.organizationId, childId: { in: childIdList }, providerId: { not: providerId }, startsAt: { gte: monthStart, lte: monthEnd }, status: { notIn: ["CANCELLED_FAMILY", "CANCELLED_PROVIDER"] } },
        select: { childId: true, discipline: true, provider: { select: { name: true } } },
        distinct: ["childId", "providerId"],
      });
      for (const s of siblingAppts) {
        if (!s.childId || !s.provider) continue;
        if (!siblingsByChildId[s.childId]) siblingsByChildId[s.childId] = [];
        if (!siblingsByChildId[s.childId].some(x => x.discipline === s.discipline)) {
          siblingsByChildId[s.childId].push({ name: s.provider.name, discipline: s.discipline });
        }
      }
    }
  }

  // ─── Open Slots tab ───────────────────────────────────────────────────────
  let openSlots: { id: string; startsAt: string; endsAt: string; discipline: string; providerName: string }[] = [];
  if (tab === "slots") {
    const raw = await prisma.appointment.findMany({
      where: { organizationId: ctx.organizationId, providerId, status: "OPEN_SLOT", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 20,
      include: { provider: { select: { name: true } } },
    });
    openSlots = raw.map(s => ({ id: s.id, startsAt: s.startsAt.toISOString(), endsAt: s.endsAt.toISOString(), discipline: s.discipline, providerName: s.provider?.name ?? "" }));
  }

  return (
    <ProviderPageClient
      providerName={provider?.name ?? ""}
      credentials={provider?.credentials ?? null}
      discipline={provider?.discipline ?? ""}
      todayCount={todayAppts.length}
      doneCount={doneCount}
      weekTotal={total}
      weekOffset={weekOffset}
      tab={tab}
      weekDays={weekDays}
      byDate={byDate}
      prevHref={prevHref}
      nextHref={nextHref}
      initialDayIndex={initialDayIndex}
      myChildren={myChildren as any}
      siblingsByChildId={siblingsByChildId}
      openSlots={openSlots}
      onCancel={cancelAppointment}
      onComplete={completeAppointment}
      onUncomplete={uncompleteAppointment}
    />
  );
}
