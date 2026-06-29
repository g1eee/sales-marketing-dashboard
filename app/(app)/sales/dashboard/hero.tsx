import { Card } from "@/components/ui/card";
import { DeltaBadge } from "./delta-badge";
import { TrendChart } from "./trend-chart";
import { formatRupiah } from "@/lib/analytics/format";
import type { TotalsComparison } from "@/lib/analytics/compare";
import type { GlobalDailyRow } from "@/lib/parsers/types";

/**
 * The thesis of the page: headline omzet for the period, period-over-period
 * change, and the daily trend — set over a soft emerald "mirage" glow.
 */
export function Hero({
  comparison,
  daily,
  periodLabel,
  statusLabel,
  compareLabel,
}: {
  comparison: TotalsComparison;
  daily: GlobalDailyRow[];
  periodLabel: string;
  statusLabel: string;
  compareLabel: string | null;
}) {
  const { current, delta } = comparison;
  return (
    <Card className="relative overflow-hidden p-6 shadow-soft sm:p-8">
      {/* In-card glow: positive stacking so it sits above the card fill but
          behind the content (the shared GlowBackground uses -z-10, which would
          hide behind the white card). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-28 left-1/3 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(20,130,100,0.16)_0%,rgba(20,130,100,0)_70%)]" />
      </div>

      <div className="relative flex flex-col gap-1">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Omzet · {statusLabel}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
            {formatRupiah(current.omzet)}
          </span>
          <DeltaBadge value={delta.omzet} />
        </div>
        <p className="text-sm text-muted-foreground">
          {periodLabel}
          {compareLabel ? ` · dibanding ${compareLabel}` : ""}
        </p>
      </div>

      <div className="relative mt-6">
        <TrendChart daily={daily} />
      </div>
    </Card>
  );
}
