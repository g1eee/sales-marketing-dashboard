import { Card } from "@/components/ui/card";
import { DeltaBadge } from "./delta-badge";

/** Generic KPI card: eyebrow label, mono value, optional period-over-period delta. */
export function StatCard({
  label,
  value,
  delta,
  invertDelta = false,
}: {
  label: string;
  value: string;
  delta?: number | null;
  invertDelta?: boolean;
}) {
  return (
    <Card className="gap-2 p-5 shadow-soft">
      <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {delta !== undefined && <DeltaBadge value={delta} invert={invertDelta} />}
    </Card>
  );
}
