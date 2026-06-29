"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { formatInt, formatPercent, formatRupiah } from "@/lib/analytics/format";
import { cn } from "@/lib/utils";
import type { GlobalChannelRow } from "@/lib/parsers/types";

const CH_LABELS: Record<string, string> = {
  halaman_produk: "Halaman Produk",
  live: "Live",
  video: "Video",
  affiliate: "Affiliate",
};
const ORDER = ["halaman_produk", "live", "video", "affiliate"];

export function PerformancePanel({ channels }: { channels: GlobalChannelRow[] }) {
  const ordered = ORDER.map((k) =>
    channels.find((c) => c.channel === k),
  ).filter((c): c is GlobalChannelRow => Boolean(c));
  const [active, setActive] = useState(ordered[0]?.channel);
  const c = ordered.find((x) => x.channel === active) ?? ordered[0];
  if (!c) return null;

  const stats = [
    { label: "Penjualan", value: formatRupiah(c.penjualan) },
    { label: "Produk Dilihat", value: formatInt(c.dilihat ?? 0) },
    { label: "Klik", value: formatInt(c.diklik ?? 0) },
    { label: "CVR", value: formatPercent(c.cvr) },
  ];

  return (
    <div className="space-y-3">
      <div className="inline-flex flex-wrap rounded-lg bg-secondary p-1 ring-1 ring-foreground/5">
        {ordered.map((x) => (
          <button
            key={x.channel}
            type="button"
            onClick={() => setActive(x.channel)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              x.channel === active
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {CH_LABELS[x.channel] ?? x.channel}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-1 p-5 shadow-soft">
            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {s.label}
            </p>
            <p className="font-mono text-2xl font-semibold tabular-nums">
              {s.value}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
