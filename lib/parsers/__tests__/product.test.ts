import { describe, it, expect } from "vitest";
import { parseProductRows } from "@/lib/parsers/product";

// Real 40-column header from the Shopee parentskudetail export.
const header = [
  "Kode Produk", "Produk", "Status Produk Saat Ini", "Kode Variasi", "Nama Variasi",
  "Status Variasi Saat Ini", "Kode Variasi", "SKU Induk",
  "Total Penjualan (Pesanan Dibuat) (IDR)", "Penjualan (Pesanan Siap Dikirim) (IDR)",
  "Jumlah Produk Dilihat", "Produk Diklik", "Persentase Klik",
  "Tingkat Konversi Pesanan (Pesanan Dibuat)", "Tingkat Konversi Pesanan (Pesanan Siap Dikirim)",
  "Pesanan Dibuat", "Pesanan Siap Dikirim", "Produk (Pesanan Dibuat)", "Produk (Pesanan Siap Dikirim)",
  "Total Pembeli (Pesanan Dibuat)", "Total Pembeli (Pesanan Siap Dikirim)",
  "Tingkat Konversi (Pesanan yang Dibuat)", "Tingkat Konversi (Pesanan Siap Dikirim)",
  "Penjualan per Pesanan (Pesanan Dibuat) (IDR)", "Penjualan per Pesanan (Pesanan Siap Dikirim) (IDR)",
  "Produk Unik Dilihat", "Produk Unik Diklik", "Pengunjung Produk (Kunjungan)",
  "Halaman Produk Dilihat", "Pengunjung Melihat Tanpa Membeli", "Tingkat Pengunjung Melihat Tanpa Membeli",
  "Klik Pencarian", "Suka", "Pengunjung Produk (Menambahkan Produk ke Keranjang)",
  "Dimasukkan ke Keranjang (Produk)", "Tingkat Konversi Produk Dimasukkan ke Keranjang",
  "Tingkat Pesanan Berulang (Pesanan Dibuat)", "% Pembelian Ulang (Pesanan Siap Dikirim)",
  "Rata-rata hari Pesanan Berulang (Pesanan Dibuat)", "Rata-rata Hari Pembelian Terulang (Pesanan Siap Dikirim)",
];

const parent = [
  "44418220234", "Jilbab Anak", "Normal", "-", "-", "-", "-", "KALUNA ZEEVA RAYON",
  "156.594.375", "148.618.553", "1963847", "90682", "4,62%", "3,07%", "2,92%",
  "2787", "2649", "5012", "4757", "2604", "2506", "8,37%", "8,05%", "56.187", "56.104",
  "416209", "39624", "31116", "82795", "5314", "17,08%", "6483", "2698", "14464",
  "29489", "46,48%", "6,57%", "5,40%", "3", "4",
];

const variation = [
  "44418220234", "Jilbab Anak", "Normal", "286497756019", "Black", "Normal",
  "kalunablack", "KALUNA ZEEVA RAYON", "7.358.614", "7.185.024", "-", "-", "-", "-",
];

describe("parseProductRows", () => {
  const { summary, detail } = parseProductRows([header, parent, variation]);

  it("puts parent rows in summary with order count and rich extras", () => {
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      kode_produk: "44418220234",
      product_name: "Jilbab Anak",
      penjualan: 156594375,
      dilihat: 1963847,
      total_pesanan: 2787, // was hardcoded null before — the "Pesanan = 0" bug
      total_pembeli: 2604,
    });
    expect(summary[0].konversi).toBeCloseTo(0.0307, 4);
    expect(summary[0].extra.units).toBe(5012);
    expect(summary[0].extra.cart).toBe(29489);
    expect(summary[0].extra.repeat_rate).toBeCloseTo(0.0657, 4);
    expect(summary[0].extra.lihat_tanpa_beli).toBe(5314);
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
