import { Card } from "@/components/ui/card";
import { formatInt, formatPercent, formatRupiah } from "@/lib/analytics/format";
import type { Funnel } from "@/lib/sales/dashboard-data";

/** Order-status funnel: omzet bar + orders/CVR + buyer breakdown per stage. */
export function FunnelCard({ funnel }: { funnel: Funnel }) {
  const stages = [
    { label: "Pesanan Dibuat", t: funnel.dibuat },
    { label: "Siap Dikirim", t: funnel.siap_dikirim },
    { label: "Dibayar", t: funnel.dibayar },
  ];
  const max = funnel.dibuat.omzet || 1;

  return (
    <Card className="p-5 shadow-soft">
      <h2 className="mb-1 font-heading text-base font-medium">Funnel Pesanan</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Omzet, pesanan, konversi & pembeli di tiap tahap
      </p>
      <div className="space-y-4">
        {stages.map((s, i) => {
          const pct = max > 0 ? s.t.omzet / max : 0;
          const retain =
            i === 0
              ? null
              : stages[i - 1].t.omzet > 0
                ? s.t.omzet / stages[i - 1].t.omzet
                : null;
          const hasBuyers =
            s.t.baru !== null || s.t.lama !== null || s.t.potensi !== null;
          return (
            <div key={s.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span>{s.label}</span>
                <span className="font-mono tabular-nums">
                  {formatRupiah(s.t.omzet)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(pct * 100, 1)}%` }}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">
                  {formatInt(s.t.pesanan)} pesanan · CVR{" "}
                  {formatPercent(s.t.konversi)}
                </span>
                {retain !== null && <span>{formatPercent(retain)} lanjut</span>}
              </div>
              {hasBuyers && (
                <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                  Baru {formatInt(s.t.baru ?? 0)} · Lama {formatInt(s.t.lama ?? 0)}{" "}
                  · Potensi {formatInt(s.t.potensi ?? 0)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
