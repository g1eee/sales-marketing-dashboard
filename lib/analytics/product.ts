import type { ProductSummaryRow } from "@/lib/parsers/types";

export interface ProductAgg {
  produk: number; // jumlah produk
  terjual: number; // unit terjual
  omzet: number;
  pembeli: number;
  pesanan: number;
  repeat_rate: number | null; // weighted by pesanan
}

const n = (x: number | null | undefined) => (typeof x === "number" ? x : 0);

export function aggregateProducts(rows: ProductSummaryRow[]): ProductAgg {
  const omzet = rows.reduce((s, r) => s + n(r.penjualan), 0);
  const pesanan = rows.reduce((s, r) => s + n(r.total_pesanan), 0);
  const terjual = rows.reduce((s, r) => s + n(r.extra?.units), 0);
  const pembeli = rows.reduce(
    (s, r) => s + n(r.total_pembeli ?? r.extra?.pembeli),
    0,
  );
  const repeatWeighted = rows.reduce(
    (s, r) =>
      s +
      (typeof r.extra?.repeat_rate === "number"
        ? r.extra.repeat_rate * n(r.total_pesanan)
        : 0),
    0,
  );
  return {
    produk: rows.length,
    terjual,
    omzet,
    pembeli,
    pesanan,
    repeat_rate: pesanan > 0 ? repeatWeighted / pesanan : null,
  };
}
