import { TrendingUp, TrendingDown } from "lucide-react";
import { formatDelta } from "@/lib/analytics/format";
import { cn } from "@/lib/utils";

/**
 * Period-over-period change pill. Emerald = up, rose = down, muted = flat/none.
 * For metrics where down is good (e.g. cancellations), pass invert.
 */
export function DeltaBadge({
  value,
  invert = false,
  className,
}: {
  value: number | null;
  invert?: boolean;
  className?: string;
}) {
  const d = formatDelta(value);
  const good =
    d.direction === "up" ? !invert : d.direction === "down" ? invert : null;
  const tone =
    good === null
      ? "bg-muted text-muted-foreground"
      : good
        ? "bg-primary/10 text-primary"
        : "bg-destructive/10 text-destructive";
  const Icon =
    d.direction === "up"
      ? TrendingUp
      : d.direction === "down"
        ? TrendingDown
        : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums",
        tone,
        className,
      )}
    >
      {Icon && <Icon className="size-3" />}
      {d.text}
    </span>
  );
}
