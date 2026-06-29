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

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              {statusLabel} · {periodLabel}
            </p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                {m.value}
              </span>
              <DeltaBadge value={m.delta} />
            </div>
            <p className="text-sm text-muted-foreground">
              {m.label}
              {compareLabel ? ` · vs ${compareLabel}` : ""}
            </p>
          </div>

          {/* compact metric switcher — sits in the empty space by the chart */}
          <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1 ring-1 ring-foreground/5">
            {metrics.map((x) => (
              <button
                key={x.key}
                type="button"
                onClick={() => setActive(x.key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  x.key === active
                    ? "bg-card text-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <ResponsiveContainer width="100%" height={240}>
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
    </Card>
  );
}
