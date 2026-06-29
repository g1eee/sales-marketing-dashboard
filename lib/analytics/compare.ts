import type { Totals } from "@/lib/analytics/aggregate";

export function pctChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return (current - previous) / previous;
}

export interface TotalsComparison {
  current: Totals;
  previous: Totals | null;
  delta: Record<keyof Totals, number | null>;
}

const KEYS: (keyof Totals)[] = [
  "omzet",
  "pesanan",
  "pengunjung",
  "penjualan_per_pesanan",
  "konversi",
  "dibatalkan",
];

export function compareTotals(
  current: Totals,
  previous: Totals | null,
): TotalsComparison {
  const delta = {} as Record<keyof Totals, number | null>;
  for (const k of KEYS) {
    const cv = (current[k] ?? 0) as number;
    const pv = previous ? ((previous[k] ?? 0) as number) : null;
    delta[k] = pctChange(cv, pv);
  }
  return { current, previous, delta };
}
