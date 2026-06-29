import { Card } from "@/components/ui/card";
import { Hero } from "./hero";
import { StatCard } from "./stat-card";
import { FunnelCard } from "./funnel-card";
import { SourceChart } from "./source-chart";
import { Section } from "./section";
import { formatInt, formatPercent, formatRupiah } from "@/lib/analytics/format";
import type { RingkasanData } from "@/lib/sales/dashboard-data";

export function RingkasanTab({
  data,
  periodLabel,
  statusLabel,
  compareLabel,
}: {
  data: RingkasanData;
  periodLabel: string;
  statusLabel: string;
  compareLabel: string | null;
}) {
  const { current, delta } = data.comparison;
  const daily = data.daily;
  const pesananSeries = daily.map((d) => d.total_pesanan);
  const pengunjungSeries = daily.map((d) => d.total_pengunjung ?? 0);
  const konversiSeries = daily.map((d) => d.konversi ?? 0);
  const aovSeries = daily.map((d) => d.penjualan_per_pesanan);

  return (
    <div className="space-y-8">
      <Hero
        comparison={data.comparison}
        daily={daily}
        periodLabel={periodLabel}
        statusLabel={statusLabel}
        compareLabel={compareLabel}
      />

      <Section title="Performa">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Pesanan"
            value={formatInt(current.pesanan)}
            delta={delta.pesanan}
            series={pesananSeries}
          />
          <StatCard
            label="Pengunjung"
            value={formatInt(current.pengunjung)}
            delta={delta.pengunjung}
            series={pengunjungSeries}
          />
          <StatCard
            label="Konversi"
            value={formatPercent(current.konversi)}
            delta={delta.konversi}
            series={konversiSeries}
          />
          <StatCard
            label="Nilai / Pesanan"
            value={formatRupiah(current.penjualan_per_pesanan)}
            delta={delta.penjualan_per_pesanan}
            series={aovSeries}
          />
        </div>
      </Section>

      <Section title="Funnel & Sumber Penjualan">
        <div className="grid gap-4 lg:grid-cols-2">
          <FunnelCard funnel={data.funnel} />
          <Card className="p-5 shadow-soft">
            <h2 className="mb-4 font-heading text-base font-medium">
              Sumber Penjualan
            </h2>
            <SourceChart sources={data.sources} />
          </Card>
        </div>
      </Section>
    </div>
  );
}
