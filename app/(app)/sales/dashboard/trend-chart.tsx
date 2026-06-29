"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GlobalDailyRow } from "@/lib/parsers/types";
import { formatInt, formatRupiah } from "@/lib/analytics/format";

interface Point {
  label: string;
  omzet: number;
  pesanan: number;
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs ring-1 ring-foreground/10 shadow-soft">
      <p className="mb-0.5 font-medium">{p.label}</p>
      <p className="font-mono tabular-nums">{formatRupiah(p.omzet)}</p>
      <p className="text-muted-foreground">{formatInt(p.pesanan)} pesanan</p>
    </div>
  );
}

export function TrendChart({ daily }: { daily: GlobalDailyRow[] }) {
  const data: Point[] = daily.map((d) => ({
    label: new Date(`${d.date}T00:00:00`).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    }),
    omzet: d.total_penjualan,
    pesanan: d.total_pesanan,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        Belum ada data harian untuk periode ini.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="omzet-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          stroke="var(--border)"
          strokeDasharray="3 3"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip
          content={<TrendTooltip />}
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
        />
        <Area
          type="monotone"
          dataKey="omzet"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#omzet-fill)"
          activeDot={{ r: 4, strokeWidth: 0, fill: "var(--chart-1)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
