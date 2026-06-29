"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SourceRow } from "@/lib/parsers/types";
import { formatRupiah } from "@/lib/analytics/format";
import { SOURCE_COLORS } from "@/lib/chart-colors";

const LABELS: Record<string, string> = {
  halaman_produk: "Halaman Produk",
  live: "Live",
  video: "Video",
  affiliate: "Affiliate",
  iklan_shopee: "Iklan Shopee",
};

interface Slice {
  name: string;
  value: number;
}

function SourceTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: { payload: Slice }[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  const pct =
    total > 0 ? ((s.value / total) * 100).toFixed(1).replace(".", ",") : "0";
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs ring-1 ring-foreground/10 shadow-soft">
      <p className="mb-0.5 font-medium">{s.name}</p>
      <p className="font-mono tabular-nums">{formatRupiah(s.value)}</p>
      <p className="text-muted-foreground">{pct}% dari total</p>
    </div>
  );
}

export function SourceChart({ sources }: { sources: SourceRow[] }) {
  const data: Slice[] = sources
    .filter((s) => s.penjualan > 0)
    .map((s) => ({ name: LABELS[s.source] ?? s.source, value: s.penjualan }))
    .sort((a, b) => b.value - a.value);
  const total = data.reduce((a, b) => a + b.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
        Belum ada data sumber penjualan.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <ResponsiveContainer width={176} height={176}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={data.length > 1 ? 2 : 0}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<SourceTooltip total={total} />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="w-full flex-1 space-y-2.5 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
              />
              {d.name}
            </span>
            <span className="font-mono tabular-nums text-muted-foreground">
              {((d.value / total) * 100).toFixed(1).replace(".", ",")}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
