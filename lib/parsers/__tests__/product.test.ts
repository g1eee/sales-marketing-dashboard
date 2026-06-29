import { describe, it, expect } from "vitest";
import { parseProductRows } from "@/lib/parsers/product";

const header = [
  "Kode Produk", "Produk", "Status Produk Saat Ini", "Kode Variasi", "Nama Variasi",
  "Status Variasi Saat Ini", "Kode Variasi", "SKU Induk",
  "Total Penjualan (Pesanan Dibuat) (IDR)", "Penjualan (Pesanan Siap Dikirim) (IDR)",
  "Jumlah Produk Dilihat", "Produk Diklik", "Persentase Klik",
  "Tingkat Konversi Pesanan (Pesanan Dibuat)",
];

const rows = [
  header,
  ["44418220234", "Jilbab Anak", "Normal", "-", "-", "-", "-", "KALUNA ZEEVA RAYON",
   "28.489.657", "27.601.677", "363940", "13046", "3,58%", "3,30%"],
  ["44418220234", "Jilbab Anak", "Normal", "286497756019", "Black", "Normal",
   "kalunablack", "KALUNA ZEEVA RAYON", "7.358.614", "7.185.024", "-", "-", "-", "-"],
];

describe("parseProductRows", () => {
  const { summary, detail } = parseProductRows(rows);

  it("puts parent rows in summary", () => {
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      kode_produk: "44418220234",
      product_name: "Jilbab Anak",
      penjualan: 28489657,
      dilihat: 363940,
    });
    expect(summary[0].persentase_klik).toBeCloseTo(0.0358, 4);
  });

  it("puts variation rows in detail", () => {
    expect(detail).toHaveLength(1);
    expect(detail[0]).toMatchObject({
      kode_produk: "44418220234",
      kode_variasi: "286497756019",
      nama_variasi: "Black",
      sku_induk: "KALUNA ZEEVA RAYON",
      penjualan: 7358614,
    });
  });
});
