import { parseIDNumber, parseIDPercent, blankToNull } from "@/lib/parsers/numbers";
import type { ProductSummaryRow, ProductDetailRow } from "@/lib/parsers/types";

function includesIdx(header: string[], needle: string): number {
  return header.findIndex((h) => (h ?? "").includes(needle));
}
function exactIdx(header: string[], needle: string): number {
  return header.findIndex((h) => (h ?? "").trim() === needle);
}

export function parseProductRows(rows: string[][]): {
  summary: ProductSummaryRow[];
  detail: ProductDetailRow[];
} {
  if (rows.length === 0) return { summary: [], detail: [] };
  const header = rows[0].map((h) => (h ?? "").toLowerCase());

  const col = {
    kode: includesIdx(header, "kode produk"),
    produk: exactIdx(header, "produk"),
    status: includesIdx(header, "status produk"),
    variasiKode: includesIdx(header, "kode variasi"),
    variasiNama: includesIdx(header, "nama variasi"),
    sku: includesIdx(header, "sku induk"),
    penjualan: includesIdx(header, "total penjualan"),
    dilihat: includesIdx(header, "jumlah produk dilihat"),
    diklik: includesIdx(header, "produk diklik"),
    persenKlik: includesIdx(header, "persentase klik"),
    konversi: includesIdx(header, "tingkat konversi pesanan"),
    // rich extras (Pesanan Dibuat variants), matched precisely to avoid the
    // many "(pesanan dibuat)" lookalikes.
    pesanan: exactIdx(header, "pesanan dibuat"),
    units: exactIdx(header, "produk (pesanan dibuat)"),
    pembeli: exactIdx(header, "total pembeli (pesanan dibuat)"),
    aov: includesIdx(header, "penjualan per pesanan (pesanan dibuat)"),
    pengunjung: includesIdx(header, "pengunjung produk (kunjungan)"),
    lihatTanpaBeli: exactIdx(header, "pengunjung melihat tanpa membeli"),
    suka: exactIdx(header, "suka"),
    cart: includesIdx(header, "dimasukkan ke keranjang (produk)"),
    cartRate: includesIdx(header, "tingkat konversi produk dimasukkan ke keranjang"),
    repeatRate: includesIdx(header, "tingkat pesanan berulang"),
  };

  const at = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "") : "");

  const summary: ProductSummaryRow[] = [];
  const detail: ProductDetailRow[] = [];

  for (const row of rows.slice(1)) {
    const kode = (row[col.kode] ?? "").trim();
    if (!kode) continue;
    const variasi = blankToNull(row[col.variasiKode] ?? "");
    if (variasi === null) {
      summary.push({
        kode_produk: kode,
        product_name: (row[col.produk] ?? "").trim(),
        penjualan: parseIDNumber(at(row, col.penjualan)) ?? 0,
        dilihat: parseIDNumber(at(row, col.dilihat)),
        diklik: parseIDNumber(at(row, col.diklik)),
        total_pesanan: parseIDNumber(at(row, col.pesanan)),
        persentase_klik: parseIDPercent(at(row, col.persenKlik)),
        konversi: parseIDPercent(at(row, col.konversi)),
        total_pembeli: parseIDNumber(at(row, col.pembeli)),
        extra: {
          units: parseIDNumber(at(row, col.units)),
          pembeli: parseIDNumber(at(row, col.pembeli)),
          aov: parseIDNumber(at(row, col.aov)),
          cart: parseIDNumber(at(row, col.cart)),
          cart_rate: parseIDPercent(at(row, col.cartRate)),
          repeat_rate: parseIDPercent(at(row, col.repeatRate)),
          pengunjung: parseIDNumber(at(row, col.pengunjung)),
          lihat_tanpa_beli: parseIDNumber(at(row, col.lihatTanpaBeli)),
          suka: parseIDNumber(at(row, col.suka)),
          status_produk: blankToNull(at(row, col.status)),
        },
      });
    } else {
      detail.push({
        kode_produk: kode,
        kode_variasi: variasi,
        nama_variasi: (row[col.variasiNama] ?? "-").trim() || "-",
        sku_induk: blankToNull(row[col.sku] ?? ""),
        penjualan: parseIDNumber(at(row, col.penjualan)) ?? 0,
        dilihat: parseIDNumber(at(row, col.dilihat)),
        diklik: parseIDNumber(at(row, col.diklik)),
        konversi: parseIDPercent(at(row, col.konversi)),
        extra: {},
      });
    }
  }

  return { summary, detail };
}
