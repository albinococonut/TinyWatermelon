"use client";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

export function FamilySearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [, start] = useTransition();

  return (
    <input
      type="search"
      defaultValue={defaultValue}
      placeholder="Search families by name, child, neighborhood…"
      className="w-full max-w-md rounded-xl border border-seed-200 bg-white px-4 py-2.5 text-[15px] outline-none focus:border-melon-400 focus:ring-2 focus:ring-melon-100"
      onChange={e => {
        const q = e.target.value;
        start(() => {
          const params = new URLSearchParams();
          if (q) params.set("q", q);
          router.replace(pathname + (params.size ? "?" + params : ""));
        });
      }}
    />
  );
}
