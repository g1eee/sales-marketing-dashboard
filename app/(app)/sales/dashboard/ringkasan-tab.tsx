import { Card } from "@/components/ui/card";
import { RevenuePanel, type RevenueMetric } from "./revenue-panel";
import { StatCard } from "./stat-card";
import { PerformancePanel } from "./performance-panel";
import { FunnelCard } from "./funnel-card";
import { SourceChart } from "./source-chart";
import { Section } from "./section";
import { formatPercent, shortWithDetail } from "@/lib/analytics/format";
import type { RingkasanData } from "@/lib/sales/dashboard-data";

const CHANNELS = ["halaman_produk", "live", "video", "affiliate"];

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
  const dateLabels = daily.map((d) =>
    new Date(`${d.date}T00:00:00`).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
    }),
  );

  // Compact headline + exact detail per KPI (detail auto-hidden when not abbreviated).
  const mk = (raw: number | null, fmt: "rupiah" | "int" | "percent") =>
    fmt === "percent"
      ? { value: formatPercent(raw) }
      : shortWithDetail(raw ?? 0, fmt);

  const metrics: RevenueMetric[] = [
    {
      key: "omzet",
      label: "Omzet",
      ...mk(current.omzet, "rupiah"),
      delta: delta.omzet,
      series: daily.map((d) => d.total_penjualan),
      format: "rupiah",
    },
    {
      key: "orders",
      label: "Pesanan",
      ...mk(current.pesanan, "int"),
      delta: delta.pesanan,
      series: daily.map((d) => d.total_pesanan),
      format: "int",
    },
    {
      key: "konversi",
      label: "Konversi",
      ...mk(current.konversi, "percent"),
      delta: delta.konversi,
      series: daily.map((d) => d.konversi ?? 0),
      format: "percent",
    },
    {
      key: "pengunjung",
      label: "Pengunjung",
      ...mk(current.pengunjung, "int"),
      delta: delta.pengunjung,
      series: daily.map((d) => d.total_pengunjung ?? 0),
      format: "int",
    },
    {
      key: "aov",
      label: "Nilai / Pesanan",
      ...mk(current.penjualan_per_pesanan, "rupiah"),
      delta: delta.penjualan_per_pesanan,
      series: daily.map((d) => d.penjualan_per_pesanan),
      format: "rupiah",
    },
  ];

  // Sumber penjualan: the 4 real channels (sum to total); Iklan Shopee is an
  // overlay shown separately as a contribution %.
  const channelSources = data.sources.filter((s) => CHANNELS.includes(s.source));
  const iklan = data.sources.find((s) => s.source === "iklan_shopee");
  const totalChannel = channelSources.reduce((a, b) => a + b.penjualan, 0);
  const iklanContribution =
    totalChannel > 0 && iklan ? iklan.penjualan / totalChannel : null;

  return (
    <div className="space-y-8">
      <Section title="Revenue">
        <RevenuePanel
          metrics={metrics}
          dateLabels={dateLabels}
          periodLabel={periodLabel}
          statusLabel={statusLabel}
          compareLabel={compareLabel}
        />
      </Section>

      <Section title="Performa">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.slice(1).map((mt) => (
            <StatCard
              key={mt.key}
              label={mt.label}
              value={mt.value}
              detail={mt.detail}
              delta={mt.delta}
              series={mt.series}
            />
          ))}
        </div>
      </Section>

      <Section title="Performance per Channel">
        {data.channels.length > 0 ? (
          <PerformancePanel channels={data.channels} />
        ) : (
          <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Upload ulang data Shopee untuk melihat performa per channel
            (impresi/klik/CTR/CVR).
          </div>
        )}
      </Section>

      <Section title="Funnel & Sumber Penjualan">
        <div className="grid gap-4 lg:grid-cols-2">
          <FunnelCard funnel={data.funnel} />
          <Card className="p-5 shadow-soft">
            <div className="mb-4 flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-base font-medium">
                Sumber Penjualan
              </h2>
              {iklanContribution !== null && (
                <span className="text-xs text-muted-foreground">
                  Kontribusi Iklan{" "}
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {formatPercent(iklanContribution)}
                  </span>
                </span>
              )}
            </div>
            <SourceChart sources={channelSources} />
          </Card>
        </div>
      </Section>
    </div>
  );
}
