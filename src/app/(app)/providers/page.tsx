import { requireSession } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { headers } from "next/headers";
import { DisciplineLabel } from "@/lib/types";
import Link from "next/link";
import { EditProviderButton } from "./EditProviderButton";
import { ProviderSearchInput } from "./ProviderSearchInput";

export const dynamic = "force-dynamic";

const DISC_COLOR: Record<string, string> = {
  OT: "bg-amber-50 text-amber-800", PT: "bg-violet-50 text-violet-800",
  SLP: "bg-sky-50 text-sky-800", MT: "bg-emerald-50 text-emerald-800", ABA: "bg-orange-50 text-orange-800",
};

function initials(name: string) {
  return name.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
}
function avatarStyle(hue: number | null) {
  const h = hue ?? 0;
  return {
    background: `linear-gradient(135deg, hsl(${h} 70% 88%) 0%, hsl(${(h + 25) % 360} 65% 75%) 100%)`,
    color: `hsl(${h} 35% 28%)`,
  };
}

export default async function ProvidersPage({ searchParams }: { searchParams?: { q?: string } }) {
  const ctx = await requireSession();
  const h = headers();
  const q = searchParams?.q?.trim() ?? "";

  await audit({
    organizationId: ctx.organizationId, userId: ctx.userId,
    action: "READ", resourceType: "Provider",
    ipAddress: h.get("x-forwarded-for") ?? h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  });

  const [providers, memberships] = await Promise.all([
    prisma.provider.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        ...(q ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { discipline: { contains: q, mode: "insensitive" } },
            { credentials: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: { name: "asc" },
    }),
    // Fetch all memberships so we know who's linked and who's available
    prisma.membership.findMany({
      where: { organizationId: ctx.organizationId, revokedAt: null, acceptedAt: { not: null } },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  // Admins/owners who don't yet have a provider linked — available to link
  const linkedUserIds = new Set(memberships.filter(m => m.providerId).map(m => m.userId));
  const availableUsers = memberships
    .filter(m => ["OWNER", "ADMIN"].includes(m.role) && !linkedUserIds.has(m.userId))
    .map(m => ({ userId: m.userId, name: m.user.name ?? m.user.email, email: m.user.email }));

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);

  const apptCounts = await prisma.appointment.groupBy({
    by: ["providerId", "status"],
    where: {
      organizationId: ctx.organizationId,
      startsAt: { gte: weekStart, lt: weekEnd },
      status: { in: ["SCHEDULED", "COMPLETED", "FILLED_MAKEUP"] },
    },
    _count: true,
  });

  const countByProvider = new Map<string, { scheduled: number; completed: number }>();
  for (const row of apptCounts) {
    const cur = countByProvider.get(row.providerId) ?? { scheduled: 0, completed: 0 };
    if (row.status === "SCHEDULED") cur.scheduled += row._count;
    else cur.completed += row._count;
    countByProvider.set(row.providerId, cur);
  }

  const isAdmin = ["OWNER", "ADMIN"].includes(ctx.role);
  const totalVisits = [...countByProvider.values()].reduce((s, v) => s + v.scheduled + v.completed, 0);

  return (
    <div>
      <PageHeader eyebrow="Providers" title="Providers"
        subtitle={`${providers.length} active · ${totalVisits} visits this week`}
        right={isAdmin ? (
          <Link href="/settings?tab=users" className="rounded-xl bg-seed-100 px-3.5 py-2 text-[14px] font-semibold text-seed-700 hover:bg-seed-200 transition">
            + Add provider
          </Link>
        ) : undefined}
      />
      <div className="px-5 py-6 md:px-10 md:py-8">
        <div className="mb-5">
          <ProviderSearchInput defaultValue={q || undefined} />
          {q && (
            <div className="mt-2 text-[12px] text-seed-500">
              {providers.length} provider{providers.length !== 1 ? "s" : ""} match &quot;{q}&quot;
            </div>
          )}
        </div>
        {/* Discipline breakdown */}
        {providers.length > 0 && (() => {
          const byDisc = providers.reduce((acc, p) => {
            acc[p.discipline] = (acc[p.discipline] ?? 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          return (
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(byDisc).sort(([a], [b]) => a.localeCompare(b)).map(([disc, count]) => (
                <span key={disc} className={`rounded-full px-3 py-1 text-[13px] font-semibold ${DISC_COLOR[disc] ?? "bg-seed-100 text-seed-700"}`}>
                  {count} {disc}
                </span>
              ))}
            </div>
          );
        })()}
        {providers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-seed-200 bg-white p-12 text-center text-[15px] text-seed-500">
            {q ? `No providers match "${q}".` : `No providers yet.${isAdmin ? " Add one via Settings → Users & Roles." : ""}`}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {providers.map((p) => {
              const counts = countByProvider.get(p.id) ?? { scheduled: 0, completed: 0 };
              const total = counts.scheduled + counts.completed;
              const pct = Math.round(Math.min(100, (total / (p.weeklyTargetHours / 1.25 || 1)) * 100));
              return (
                <article key={p.id} className="rounded-2xl border border-seed-200 bg-white p-5 shadow-card">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold"
                      style={avatarStyle(p.avatarHue)}>
                      {initials(p.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15.5px] font-semibold text-seed-900">{p.name}</div>
                      {p.credentials && <div className="text-[12.5px] text-seed-500">{p.credentials}</div>}
                      {p.title && <div className="text-[12.5px] text-seed-500">{p.title}</div>}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ${DISC_COLOR[p.discipline] ?? "bg-seed-100 text-seed-700"}`}>
                          {DisciplineLabel[p.discipline as keyof typeof DisciplineLabel] ?? p.discipline}
                        </span>
                        {p.bilingual && <span className="rounded-md bg-melon-50 px-1.5 py-0.5 text-[11px] font-semibold text-melon-700">EN/ES</span>}
                      </div>
                    </div>
                  </div>
                  {/* Utilization */}
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-[13px]">
                      <span className="text-seed-500">This week</span>
                      <span className="font-semibold text-seed-700 tabular-nums">
                        {counts.completed} complete · {counts.scheduled} remaining
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-seed-100">
                      <div className={`h-full rounded-full ${pct >= 80 ? "bg-rind-500" : "bg-melon-400"}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-[11.5px] text-seed-400">Target {p.weeklyTargetHours}h/wk · {p.bufferMinutes}min buffer</div>
                  </div>
                  <div className="mt-3 text-[12.5px] text-seed-500">📍 {p.startAddress ?? "School base"}</div>
                  <EditProviderButton
                    provider={p}
                    isAdmin={isAdmin}
                    linkedUser={memberships.find(m => m.providerId === p.id)?.user ?? null}
                    availableUsers={availableUsers}
                  />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
