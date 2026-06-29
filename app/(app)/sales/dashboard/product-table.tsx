import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportButton } from "./export-button";
import { formatInt, formatPercent, formatRupiah } from "@/lib/analytics/format";
import { toCsv } from "@/lib/analytics/csv";
import type { ProductSummaryRow } from "@/lib/parsers/types";

const TOP_N = 15;

export function ProductTable({ products }: { products: ProductSummaryRow[] }) {
  const csv = toCsv(
    ["Kode Produk", "Produk", "Omzet", "Unit", "Pesanan", "Dilihat", "Konversi"],
    products.map((p) => [
      p.kode_produk,
      p.product_name,
      p.penjualan,
      p.extra?.units ?? null,
      p.total_pesanan,
      p.dilihat,
      p.konversi,
    ]),
  );
  const top = products.slice(0, TOP_N);

  return (
    <Card className="h-full p-5 shadow-soft sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-medium">Produk Terlaris</h2>
          <p className="text-xs text-muted-foreground">
            {products.length} produk · {Math.min(TOP_N, products.length)} teratas
            menurut omzet
          </p>
        </div>
        {products.length > 0 && (
          <ExportButton filename="produk-terlaris.csv" csv={csv} />
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-6 text-right text-muted-foreground">#</TableHead>
            <TableHead>Produk</TableHead>
            <TableHead className="text-right">Omzet</TableHead>
            <TableHead className="text-right">Unit</TableHead>
            <TableHead className="text-right">Konversi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-10 text-center text-muted-foreground"
              >
                Tidak ada data produk.
              </TableCell>
            </TableRow>
          )}
          {top.map((p, i) => (
            <TableRow key={p.kode_produk}>
              <TableCell className="text-right font-mono text-xs tabular-nums text-muted-foreground">
                {i + 1}
              </TableCell>
              <TableCell className="max-w-[22rem] whitespace-normal">
                <span className="line-clamp-2 font-medium" title={p.product_name}>
                  {p.product_name}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatRupiah(p.penjualan)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatInt(p.extra?.units ?? 0)}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {formatPercent(p.konversi)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
