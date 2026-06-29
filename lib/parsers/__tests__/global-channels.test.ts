import { describe, it, expect } from "vitest";
import { parseGlobalWorkbook } from "@/lib/parsers/global";

const sheets = [
  {
    name: "Pesanan Dibuat",
    rows: [
      ["Tanggal", "Total Penjualan (IDR)", "Total Pesanan", "Penjualan per Pesanan", "Produk Diklik", "Total Pengunjung", "Tingkat Konversi Pesanan", "Pesanan Dibatalkan", "Penjualan Dibatalkan", "Pesanan Dikembalikan", "Penjualan Dikembalikan", "Pembeli", "Total Pembeli Baru", "Total Pembeli Saat Ini", "Total Potensi Pembeli"],
      ["01-01-2026-31-01-2026", "597.844.051", "12342", "48.439,80", "447092", "443032", "2,76%", "1206", "", "", "", "11157", "9086", "2071", "40845"],
      ["Tanggal", "Total Penjualan (IDR)", "Total Pesanan", "Penjualan per Pesanan", "Produk Diklik", "Total Pengunjung", "Tingkat Konversi Pesanan", "Pesanan Dibatalkan"],
      ["01-01-2026", "28.200.952", "592", "47.636,74", "15581", "22560", "3,80%", "52"],
      ["02-01-2026", "8.842.872", "246", "37.285,48", "8761", "12000", "2,71%", "10"],
    ],
  },
  {
    name: "Asal Kunjungan (pesanan yang dibuat)",
    rows: [
      ["Tanggal", "Status Pesanan", "Penjualan (IDR)", "Penjualan dari halaman produk", "Penjualan dari Live Penjual", "Penjualan dari Video Penjual", "Penjualan dari Affiliate", "Penjualan dari Iklan Shopee"],
      ["01-01-2026-31-01-2026", "Pesanan Dibuat", "597.844.051", "301.006.160", "200.681.160", "22.298.291", "73.858.440", "505.431.297"],
      ["Halaman Produk", "", "", "", "", "", "", "", "", "", "", "", ""],
      ["Sumber Kunjungan", "Rasio Penjualan", "Penjualan (IDR)", "Jumlah Produk Dilihat", "Produk Diklik", "Total Pesanan", "Produk", "Persentase Klik", "Tingkat Konversi Pesanan", "Penjualan per Pesanan", "Total Pembeli", "Produk Unik Dilihat", "Produk Unik Diklik"],
      ["Halaman Produk", "100,00%", "301.006.160", "7.005.080", "280.975", "7.022,31", "15.139,00", "4,01%", "2,50%", "42.864,24", "7.086", "993.904", "106.353"],
      ["Live Penjual", "100,00%", "200.681.160", "40.858", "92.071", "3.147,16", "7.412,00", "225,34%", "3,42%", "63.765,80", "3.150", "8.195", "19.036"],
      ["Video Penjual", "100,00%", "22.298.291", "53.728", "12.889", "547,45", "957,00", "23,99%", "4,25%", "40.731,19", "545", "35.795", "8.621"],
      ["Affiliate", "100,00%", "73.858.440", "944.397", "61.157", "1.625,08", "2.884,00", "6,48%", "2,66%", "45.449,22", "1.745", "209.886", "37.525"],
    ],
  },
];

describe("parseGlobalWorkbook — channels & buyers", () => {
  const result = parseGlobalWorkbook(sheets);

  it("stamps accurate period buyer totals on each daily row (not summed)", () => {
    expect(result.daily).toHaveLength(2);
    for (const d of result.daily) {
      expect(d.pembeli_baru).toBe(9086);
      expect(d.pembeli_lama).toBe(2071);
      expect(d.potensi_pembeli).toBe(40845);
    }
  });

  it("parses the 4 channel total rows from the visit sheet, tagged by status", () => {
    expect(result.channels.map((c) => c.channel)).toEqual([
      "halaman_produk",
      "live",
      "video",
      "affiliate",
    ]);
    expect(result.channels.every((c) => c.status === "dibuat")).toBe(true);

    const hp = result.channels.find((c) => c.channel === "halaman_produk")!;
    expect(hp.penjualan).toBe(301006160);
    expect(hp.dilihat).toBe(7005080);
    expect(hp.diklik).toBe(280975);
    expect(hp.unik_dilihat).toBe(993904);
    expect(hp.cvr).toBeCloseTo(0.025, 4);

    const live = result.channels.find((c) => c.channel === "live")!;
    expect(live.unik_dilihat).toBe(8195); // proxy "pengunjung" for Live
    expect(live.ctr).toBeCloseTo(2.2534, 4); // Shopee's real (odd) Live CTR
  });
});
