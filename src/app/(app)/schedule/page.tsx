import { requireSession } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { WeekGrid } from "@/components/WeekGrid";
import { mondayOfWeek, weekLabel, makeWeekDays, fetchWeekAppts } from "@/lib/schedule";
import { Suspense } from "react";
import { ScheduleFilter } from "./ScheduleFilter";
import { cancelAppointment, completeAppointment, uncompleteAppointment, uncancelAppointment } from "./actions";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams?: { week?: string; provider?: string; discipline?: string };
}) {
  const ctx = await requireSession();
  const weekOffset = parseInt(searchParams?.week ?? "0", 10) || 0;
  const monday = mondayOfWeek(weekOffset);
  const weekDays = makeWeekDays(monday);

  const filterProviderId = searchParams?.provider ?? undefined;
  const filterDiscipline = searchParams?.discipline ?? undefined;

  // Fetch all providers for the filter dropdown
  const allProviders = await prisma.provider.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    select: { id: true, name: true, discipline: true },
    orderBy: { name: "asc" },
  });

  const byDate = await fetchWeekAppts({
    organizationId: ctx.organizationId,
    monday,
    providerId: filterProviderId,
  });

  // Apply discipline filter on the result if set (and no provider filter)
  const filteredByDate = filterDiscipline && !filterProviderId
    ? Object.fromEntries(
        Object.entries(byDate).map(([date, appts]) => [
          date,
          appts.filter((a) => a.discipline === filterDiscipline),
        ])
      )
    : byDate;

  const total = Object.values(filteredByDate).flat().length;

  // Map providers to the shape ScheduleFilter expects
  const filterProviders = allProviders.map((p) => ({
    id: p.id,
    name: p.name,
    discipline: p.discipline,
  }));

  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col md:h-screen">
      <PageHeader
        eyebrow="Schedule"
        title="This week"
        subtitle={`${weekLabel(monday)} · ${total} visits`}
      />
      <Suspense>
        <ScheduleFilter providers={filterProviders} />
      </Suspense>
      <div className="min-h-0 flex-1 overflow-hidden">
        <WeekGrid
          weekDays={weekDays}
          byDate={filteredByDate}
          prevHref={`/schedule?week=${weekOffset - 1}${filterProviderId ? `&provider=${filterProviderId}` : ""}${filterDiscipline ? `&discipline=${filterDiscipline}` : ""}`}
          nextHref={`/schedule?week=${weekOffset + 1}${filterProviderId ? `&provider=${filterProviderId}` : ""}${filterDiscipline ? `&discipline=${filterDiscipline}` : ""}`}
          isCurrentWeek={weekOffset === 0}
          weekLabel={weekLabel(monday)}
          onCancel={cancelAppointment}
          onComplete={completeAppointment}
          onUncomplete={uncompleteAppointment}
        />
      </div>
    </div>
  );
}
