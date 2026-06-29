import { cn } from "@/lib/utils";

/**
 * Tiny inline-SVG trend line (no deps). Gives a KPI its "context" — the shape
 * of the period — without a full chart. Colors via currentColor.
 */
export function Sparkline({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) {
  const pts = data.filter((n) => Number.isFinite(n));
  if (pts.length < 2) return null;

  const w = 80;
  const h = 24;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const points = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
      className={cn("h-6 w-20", className)}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
