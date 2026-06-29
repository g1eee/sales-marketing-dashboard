import { Card } from "@/components/ui/card";
import { formatPercent, formatRupiah } from "@/lib/analytics/format";
import type { Funnel } from "@/lib/sales/dashboard-data";

/** Order-status funnel by omzet: Dibuat → Siap Dikirim → Dibayar, with retention. */
export function FunnelCard({ funnel }: { funnel: Funnel }) {
  const stages = [
    { label: "Pesanan Dibuat", value: funnel.dibuat },
    { label: "Siap Dikirim", value: funnel.siap_dikirim },
    { label: "Dibayar", value: funnel.dibayar },
  ];
  const max = funnel.dibuat || 1;

  return (
    <Card className="p-5 shadow-soft">
      <h2 className="mb-1 font-heading text-base font-medium">
        Funnel Pesanan
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Omzet yang bertahan dari dibuat hingga dibayar
      </p>
      <div className="space-y-3.5">
        {stages.map((s, i) => {
          const pct = max > 0 ? s.value / max : 0;
          const retain =
            i === 0
              ? null
              : stages[i - 1].value > 0
                ? s.value / stages[i - 1].value
                : null;
          return (
            <div key={s.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span>{s.label}</span>
                <span className="font-mono tabular-nums">
                  {formatRupiah(s.value)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(pct * 100, 1)}%` }}
                />
              </div>
              {retain !== null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatPercent(retain)} lanjut dari tahap sebelumnya
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
