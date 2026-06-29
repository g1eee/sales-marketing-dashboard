import { Card } from "@/components/ui/card";
import { DeltaBadge } from "./delta-badge";
import { formatInt, formatPercent, formatRupiah } from "@/lib/analytics/format";
import type { TotalsComparison } from "@/lib/analytics/compare";

export function KpiCards({ comparison }: { comparison: TotalsComparison }) {
  const { current, delta } = comparison;
  const cards = [
    { label: "Total Pesanan", value: formatInt(current.pesanan), d: delta.pesanan },
    { label: "Pengunjung", value: formatInt(current.pengunjung), d: delta.pengunjung },
    { label: "Konversi", value: formatPercent(current.konversi), d: delta.konversi },
    {
      label: "Nilai / Pesanan",
      value: formatRupiah(current.penjualan_per_pesanan),
      d: delta.penjualan_per_pesanan,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="gap-2 p-5 shadow-soft">
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            {c.label}
          </p>
          <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
            {c.value}
          </p>
          <DeltaBadge value={c.d} />
        </Card>
      ))}
    </div>
  );
}
