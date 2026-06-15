// Shared schedule query helpers — used by both /schedule (org-wide)
// and /me (provider's own day).

import { prisma } from "./db";
import type { GridAppt } from "@/components/WeekGrid";

export function mondayOfWeek(weekOffset: number): string {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  return d.toISOString().slice(0, 10);
}

function localDate(iso: string): string {
  const d = new Date(iso);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function weekLabel(monday: string): string {
  const [y, m, d] = monday.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6); // Mon–Sun
  if (start.getMonth() === end.getMonth()) {
    return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${start.getFullYear()}`;
}

export function makeWeekDays(monday: string) {
  const today = new Date().toISOString().slice(0, 10);
  return Array.from({ length: 7 }, (_, i) => {
    const ds = addDays(monday, i);
    const [y, mm, d] = ds.split("-").map(Number);
    const dt = new Date(y, mm - 1, d);
    return {
      dateStr: ds,
      label: dt.toLocaleDateString("en-US", { weekday: "short" }),
      fullLabel: dt.toLocaleDateString("en-US", { weekday: "long" }),
      dayNum: dt.getDate(),
      isToday: ds === today,
      isWeekend: dt.getDay() === 0 || dt.getDay() === 6,
    };
  });
}

export async function fetchWeekAppts(opts: {
  organizationId: string;
  monday: string;
  providerId?: string;
}): Promise<Record<string, GridAppt[]>> {
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(opts.monday, i));
  const start = new Date(opts.monday + "T00:00:00");
  const end = new Date(addDays(opts.monday, 7) + "T00:00:00");

  const appts = await prisma.appointment.findMany({
    where: {
      organizationId: opts.organizationId,
      startsAt: { gte: start, lt: end },
      ...(opts.providerId ? { providerId: opts.providerId } : {}),
    },
    include: {
      child: { select: { id: true, firstName: true, lastName: true, family: { select: { primaryContactName: true, secondaryContactName: true, homeNeighborhood: true, homeCity: true } } } },
      provider: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  // For provider-specific views, fetch other providers seeing the same children this week
  const siblingsByChild: Record<string, { name: string; discipline: string }[]> = {};
  if (opts.providerId) {
    const childIds = [...new Set(appts.filter(a => a.childId).map(a => a.childId!))];
    if (childIds.length > 0) {
      const siblings = await prisma.appointment.findMany({
        where: {
          organizationId: opts.organizationId,
          childId: { in: childIds },
          providerId: { not: opts.providerId },
          startsAt: { gte: start, lt: end },
          status: { notIn: ["CANCELLED_FAMILY", "CANCELLED_PROVIDER"] },
        },
        select: { childId: true, discipline: true, provider: { select: { name: true } } },
        distinct: ["childId", "providerId"],
        orderBy: { startsAt: "desc" },
      });
      for (const s of siblings) {
        if (!s.childId || !s.provider) continue;
        if (!siblingsByChild[s.childId]) siblingsByChild[s.childId] = [];
        // Keep only ONE per discipline (most recent due to desc ordering)
        if (!siblingsByChild[s.childId].some(x => x.discipline === s.discipline)) {
          siblingsByChild[s.childId].push({ name: s.provider.name, discipline: s.discipline });
        }
      }
    }
  }

  const byDate: Record<string, GridAppt[]> = {};
  for (const ds of weekDates) byDate[ds] = [];

  for (const a of appts) {
    const key = localDate(a.startsAt.toISOString());
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push({
      id: a.id,
      start: a.startsAt.toISOString(),
      end: a.endsAt.toISOString(),
      status: a.status,
      discipline: a.discipline,
      locationAddress: a.locationAddress,
      locationNeighborhood: a.child?.family?.homeNeighborhood ?? a.child?.family?.homeCity ?? null,
      childName: a.child ? `${a.child.firstName} ${a.child.lastName[0]}.` : null,
      parentName: a.child?.family
  ? [a.child.family.primaryContactName, (a.child.family as any).secondaryContactName].filter(Boolean).join(" & ") || null
  : null,
      providerName: a.provider?.name,
      otherProviders: a.child ? (siblingsByChild[a.child.id] ?? []) : [],
      notes: a.notes,
    });
  }
  return byDate;
}
