"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface BillingType { id: string; label: string; color: string | null; }

function FamilyBillingFilterInner({ billingTypes }: { billingTypes: BillingType[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("billing") ?? "";

  function toggle(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (current === id) params.delete("billing");
    else params.set("billing", id);
    router.replace(pathname + (params.size ? "?" + params : ""));
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {billingTypes.map(bt => (
        <button key={bt.id} onClick={() => toggle(bt.id)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold transition ${
            current === bt.id ? "bg-seed-900 text-white" : "bg-white text-seed-700 ring-1 ring-seed-200 hover:bg-seed-50"
          }`}>
          {bt.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: bt.color }} />}
          {bt.label}
        </button>
      ))}
      {current && (
        <button onClick={() => toggle(current)}
          className="rounded-full bg-seed-100 px-3 py-1 text-[13px] font-medium text-seed-600 hover:bg-seed-200">
          Clear ✕
        </button>
      )}
    </div>
  );
}

export function FamilyBillingFilter({ billingTypes }: { billingTypes: BillingType[] }) {
  return (
    <Suspense>
      <FamilyBillingFilterInner billingTypes={billingTypes} />
    </Suspense>
  );
}
