"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { DeltaBadge } from "./delta-badge";
import { CHART } from "@/lib/chart-colors";
import { formatInt, formatPercent, formatRupiah } from "@/lib/analytics/format";
import { cn } from "@/lib/utils";

export type MetricFormat = "rupiah" | "int" | "percent";

export interface RevenueMetric {
  key: string;
  label: string;
  value: string;
  delta: number | null;
  series: number[];
  format: MetricFormat;
}

function fmt(v: number, f: MetricFormat) {
  if (f === "rupiah") return formatRupiah(v);
  if (f === "percent") return formatPercent(v);
  return formatInt(v);
}

function ChartTooltip({
  active,
  payload,
  format,
}: {
  active?: boolean;
  payload?: { payload: { label: string; value: number } }[];
  format: MetricFormat;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs ring-1 ring-foreground/10 shadow-soft">
      <p className="mb-0.5 font-medium">{p.label}</p>
      <p className="font-mono tabular-nums">{fmt(p.value, format)}</p>
    </div>
  );
}

export function RevenuePanel({
  metrics,
  dateLabels,
  periodLabel,
  statusLabel,
  compareLabel,
}: {
  metrics: RevenueMetric[];
  dateLabels: string[];
  periodLabel: string;
  statusLabel: string;
  compareLabel: string | null;
}) {
  const [active, setActive] = useState(metrics[0]?.key);
  const m = metrics.find((x) => x.key === active) ?? metrics[0];
  const data = m.series.map((v, i) => ({ label: dateLabels[i] ?? "", value: v }));

  return (
    <Card className="relative overflow-hidden p-6 shadow-soft sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-28 left-1/3 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_70%)]" />
      </div>
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,16rem)_1fr]">
        <div className="space-y-1">
          <p className="mb-2 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            {statusLabel} · {periodLabel}
          </p>
          {metrics.map((x) => (
            <button
              key={x.key}
              type="button"
              onClick={() => setActive(x.key)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                x.key === active ? "bg-secondary" : "hover:bg-secondary/50",
              )}
            >
              <span className="text-sm text-muted-foreground">{x.label}</span>
              <span className="font-mono text-sm font-medium tabular-nums">
                {x.value}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {m.value}
            </span>
            <DeltaBadge value={m.delta} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {m.label}
            {compareLabel ? ` · vs ${compareLabel}` : ""}
          </p>
          <div className="mt-5">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.line} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={CHART.line} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke={CHART.grid}
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tick={{ fontSize: 11, fill: CHART.axis }}
                />
                <YAxis hide domain={[0, "dataMax"]} />
                <Tooltip
                  content={<ChartTooltip format={m.format} />}
                  cursor={{ stroke: CHART.grid, strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={CHART.line}
                  strokeWidth={2}
                  fill="url(#rev-fill)"
                  activeDot={{ r: 4, strokeWidth: 0, fill: CHART.line }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Card>
  );
}
