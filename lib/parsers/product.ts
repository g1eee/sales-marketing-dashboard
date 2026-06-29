import { parseIDNumber, parseIDPercent, blankToNull } from "@/lib/parsers/numbers";
import type { ProductSummaryRow, ProductDetailRow } from "@/lib/parsers/types";

function indexOfHeader(header: string[], needle: string): number {
  return header.findIndex((h) => (h ?? "").toLowerCase().includes(needle));
}

export function parseProductRows(rows: string[][]): {
  summary: ProductSummaryRow[];
  detail: ProductDetailRow[];
} {
  if (rows.length === 0) return { summary: [], detail: [] };
  const header = rows[0].map((h) => (h ?? "").toLowerCase());

  const col = {
    kode: indexOfHeader(header, "kode produk"),
    produk: header.findIndex((h) => h.trim() === "produk"),
    variasiKode: header.findIndex((h) => h.includes("kode variasi")),
    variasiNama: indexOfHeader(header, "nama variasi"),
    sku: indexOfHeader(header, "sku induk"),
    penjualan: indexOfHeader(header, "total penjualan"),
    dilihat: indexOfHeader(header, "jumlah produk dilihat"),
    diklik: indexOfHeader(header, "produk diklik"),
    persenKlik: indexOfHeader(header, "persentase klik"),
    konversi: indexOfHeader(header, "tingkat konversi pesanan"),
  };

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
        penjualan: parseIDNumber(row[col.penjualan]) ?? 0,
        dilihat: parseIDNumber(row[col.dilihat]),
        diklik: parseIDNumber(row[col.diklik]),
        total_pesanan: null,
        persentase_klik: parseIDPercent(row[col.persenKlik]),
        konversi: parseIDPercent(row[col.konversi]),
        total_pembeli: null,
        extra: {},
      });
    } else {
      detail.push({
        kode_produk: kode,
        kode_variasi: variasi,
        nama_variasi: (row[col.variasiNama] ?? "-").trim() || "-",
        sku_induk: blankToNull(row[col.sku] ?? ""),
        penjualan: parseIDNumber(row[col.penjualan]) ?? 0,
        dilihat: parseIDNumber(row[col.dilihat]),
        diklik: parseIDNumber(row[col.diklik]),
        konversi: parseIDPercent(row[col.konversi]),
        extra: {},
      });
    }
  }

  return { summary, detail };
}
