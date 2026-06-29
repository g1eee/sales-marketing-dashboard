import { Card } from "@/components/ui/card";
import { DeltaBadge } from "./delta-badge";
import { Sparkline } from "./sparkline";

/**
 * Generic KPI card: eyebrow label, mono value, period-over-period delta, and an
 * optional sparkline (the metric's shape over the period) for context.
 */
export function StatCard({
  label,
  value,
  delta,
  invertDelta = false,
  series,
}: {
  label: string;
  value: string;
  delta?: number | null;
  invertDelta?: boolean;
  series?: number[];
}) {
  const hasSpark = series !== undefined && series.length > 1;
  return (
    <Card className="gap-2 p-5 shadow-soft">
      <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {(delta !== undefined || hasSpark) && (
        <div className="flex items-end justify-between gap-2">
          {delta !== undefined ? (
            <DeltaBadge value={delta} invert={invertDelta} />
          ) : (
            <span />
          )}
          {hasSpark && <Sparkline data={series} className="text-primary/70" />}
        </div>
      )}
    </Card>
  );
}
