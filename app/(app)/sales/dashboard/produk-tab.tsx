import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "./stat-card";
import { ProductTable } from "./product-table";
import { Section } from "./section";
import { pctChange } from "@/lib/analytics/compare";
import { formatInt, formatPercent, shortWithDetail } from "@/lib/analytics/format";
import type { ProdukData } from "@/lib/sales/dashboard-data";

const num = (x: number | null | undefined) => (typeof x === "number" ? x : 0);

function FunnelRow({
  label,
  value,
  pct,
}: {
  label: string;
  value: number;
  pct: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{formatInt(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.max(pct * 100, 1)}%` }}
        />
      </div>
    </div>
  );
}

export function ProdukTab({ data }: { data: ProdukData }) {
  const { products, current, previous } = data;
  const d = (cur: number, prev: number | null | undefined) =>
    previous ? pctChange(cur, prev ?? null) : undefined;

  const funnel = [
    { label: "Impresi", value: current.dilihat },
    { label: "Klik", value: current.diklik },
    { label: "Keranjang", value: current.atc },
    { label: "Pesanan", value: current.pesanan },
    { label: "Repeat Order", value: current.repeat_orders },
  ];
  const peak = current.dilihat || 1;

  const withConv = products.filter(
    (p) => p.konversi != null && num(p.dilihat) > 0,
  );
  const avgConv = withConv.length
    ? withConv.reduce((s, p) => s + (p.konversi as number), 0) / withConv.length
    : 0;
  const optimize = withConv
    .filter((p) => (p.konversi as number) < avgConv)
    .sort((a, b) => num(b.dilihat) - num(a.dilihat))
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <Section title="Ringkasan Produk">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Omset"
            {...shortWithDetail(current.omzet, "rupiah")}
            delta={d(current.omzet, previous?.omzet)}
          />
          <StatCard
            label="Impresi"
            {...shortWithDetail(current.dilihat, "int")}
            delta={d(current.dilihat, previous?.dilihat)}
          />
          <StatCard
            label="Klik"
            {...shortWithDetail(current.diklik, "int")}
            delta={d(current.diklik, previous?.diklik)}
          />
          <StatCard
            label="ATC"
            {...shortWithDetail(current.atc, "int")}
            delta={d(current.atc, previous?.atc)}
          />
          <StatCard
            label="Qty Produk"
            {...shortWithDetail(current.terjual, "int")}
            delta={d(current.terjual, previous?.terjual)}
          />
        </div>
      </Section>

      <Section title="Funnel & Produk Terlaris">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 shadow-soft">
            <h2 className="mb-1 font-heading text-base font-medium">
              Funnel Produk
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Impresi → klik → keranjang → pesanan → repeat order (agregat)
            </p>
            <div className="space-y-3.5">
              {funnel.map((f) => (
                <FunnelRow
                  key={f.label}
                  label={f.label}
                  value={f.value}
                  pct={f.value / peak}
                />
              ))}
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
              <div>
                <dt className="text-xs text-muted-foreground">Klik/Lihat</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {formatPercent(
                    current.dilihat ? current.diklik / current.dilihat : null,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Keranjang/Klik</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {formatPercent(
                    current.diklik ? current.atc / current.diklik : null,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Pesanan/Krnjg</dt>
                <dd className="font-mono text-sm tabular-nums">
                  {formatPercent(
                    current.atc ? current.pesanan / current.atc : null,
                  )}
                </dd>
              </div>
            </dl>
          </Card>
          <div className="lg:col-span-2">
            <ProductTable products={products} />
          </div>
        </div>
      </Section>

      <Card className="p-5 shadow-soft sm:p-6">
        <h2 className="mb-1 font-heading text-base font-medium">
          Perlu Dioptimasi
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Trafik tinggi tapi konversi di bawah rata-rata ({formatPercent(avgConv)}
          ) — kandidat perbaikan judul / foto / harga
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Dilihat</TableHead>
              <TableHead className="text-right">Konversi</TableHead>
              <TableHead className="text-right">Pesanan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimize.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-8 text-center text-muted-foreground"
                >
                  Tidak ada kandidat.
                </TableCell>
              </TableRow>
            )}
            {optimize.map((p) => (
              <TableRow key={p.kode_produk}>
                <TableCell className="max-w-[26rem] whitespace-normal">
                  <span
                    className="line-clamp-2 font-medium"
                    title={p.product_name}
                  >
                    {p.product_name}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatInt(num(p.dilihat))}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-destructive">
                  {formatPercent(p.konversi)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatInt(num(p.total_pesanan))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
