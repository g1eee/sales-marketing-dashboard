import type { ProductSummaryRow } from "@/lib/parsers/types";

export interface ProductAgg {
  produk: number; // jumlah produk
  terjual: number; // unit terjual
  omzet: number;
  dilihat: number;
  diklik: number;
  atc: number; // add to cart
  pembeli: number;
  pesanan: number;
  repeat_rate: number | null; // weighted by pesanan
  repeat_orders: number; // repeat_rate × pesanan, summed
}

const n = (x: number | null | undefined) => (typeof x === "number" ? x : 0);

export function aggregateProducts(rows: ProductSummaryRow[]): ProductAgg {
  const omzet = rows.reduce((s, r) => s + n(r.penjualan), 0);
  const pesanan = rows.reduce((s, r) => s + n(r.total_pesanan), 0);
  const terjual = rows.reduce((s, r) => s + n(r.extra?.units), 0);
  const dilihat = rows.reduce((s, r) => s + n(r.dilihat), 0);
  const diklik = rows.reduce((s, r) => s + n(r.diklik), 0);
  const atc = rows.reduce((s, r) => s + n(r.extra?.cart), 0);
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
    dilihat,
    diklik,
    atc,
    pembeli,
    pesanan,
    repeat_rate: pesanan > 0 ? repeatWeighted / pesanan : null,
    repeat_orders: Math.round(repeatWeighted),
  };
}
