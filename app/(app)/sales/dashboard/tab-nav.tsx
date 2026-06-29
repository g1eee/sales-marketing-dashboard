"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "produk", label: "Produk" },
  { key: "iklan", label: "Iklan" },
] as const;

export type TabKey = (typeof TABS)[number]["key"];

export function TabNav({
  params,
  active,
}: {
  params: Record<string, string | undefined>;
  active: TabKey;
}) {
  const href = (tab: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    if (tab !== "ringkasan") q.set("tab", tab);
    else q.delete("tab");
    const s = q.toString();
    return `/sales/dashboard${s ? `?${s}` : ""}`;
  };

  return (
    <div className="inline-flex rounded-lg bg-secondary p-1 ring-1 ring-foreground/5">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={href(t.key)}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
            active === t.key
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
