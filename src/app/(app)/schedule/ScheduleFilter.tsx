"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Provider {
  id: string;
  name: string;
  discipline: string;
}

export function ScheduleFilter({ providers }: { providers: Provider[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentProvider = searchParams.get("provider") ?? "";
  const currentDisc = searchParams.get("discipline") ?? "";

  const discCounts = providers.reduce((acc, p) => {
    acc[p.discipline] = (acc[p.discipline] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const DISC_COLORS: Record<string, string> = {
    OT: "bg-amber-50 text-amber-800 ring-amber-200",
    SLP: "bg-sky-50 text-sky-800 ring-sky-200",
    PT: "bg-violet-50 text-violet-800 ring-violet-200",
    MT: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    ABA: "bg-orange-50 text-orange-800 ring-orange-200",
  };

  function update(key: string, val: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set(key, val);
    else params.delete(key);
    if (key === "discipline") params.delete("provider");
    if (key === "provider") params.delete("discipline");
    router.replace(pathname + "?" + params.toString());
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("provider");
    params.delete("discipline");
    router.replace(pathname + "?" + params.toString());
  }

  return (
    <div className="flex flex-wrap gap-2 border-b border-seed-200 bg-white px-4 py-2.5">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(discCounts).sort().map(([disc, count]) => (
          <button
            key={disc}
            onClick={() => update("discipline", currentDisc === disc ? "" : disc)}
            className={`rounded-full px-3 py-1 text-[13px] font-semibold ring-1 transition ${
              currentDisc === disc
                ? "bg-seed-900 text-white ring-seed-900"
                : DISC_COLORS[disc] ?? "bg-seed-100 text-seed-700 ring-seed-200"
            } hover:scale-105`}
          >
            {count} {disc}
          </button>
        ))}
      </div>
      <select
        value={currentProvider}
        onChange={(e) => update("provider", e.target.value)}
        className="rounded-lg border border-seed-200 bg-white px-2.5 py-1.5 text-[13px] focus:border-melon-400 focus:outline-none"
      >
        <option value="">All providers</option>
        {providers
          .filter((p) => !currentDisc || p.discipline === currentDisc)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.discipline})
            </option>
          ))}
      </select>
      {(currentProvider || currentDisc) && (
        <button
          onClick={clearAll}
          className="rounded-lg bg-seed-100 px-2.5 py-1.5 text-[13px] font-medium text-seed-600 hover:bg-seed-200"
        >
          Clear ✕
        </button>
      )}
    </div>
  );
}
