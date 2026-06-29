import { PageHeader } from "@/components/page-header";
import { GlowBackground } from "@/components/glow-background";
import { Card } from "@/components/ui/card";

const KPIS = [
  { label: "Total Omset", value: "—" },
  { label: "Total Pesanan", value: "—" },
  { label: "Total Pengunjung", value: "—" },
  { label: "Konversi", value: "—" },
];

export default function HomePage() {
  return (
    <div className="relative">
      <GlowBackground />
      <PageHeader
        title="Ringkasan"
        description="Selamat datang di Miragie. Pilih menu di samping untuk mulai."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-muted-foreground text-sm">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {kpi.value}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">Belum ada data</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
