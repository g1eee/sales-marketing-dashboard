import { describe, it, expect } from "vitest";
import { parseGlobalWorkbook } from "@/lib/parsers/global";

const dailyHeader = [
  "Tanggal", "Total Penjualan (IDR)", "Total Pesanan", "Penjualan per Pesanan",
  "Produk Diklik", "Total Pengunjung", "Tingkat Konversi Pesanan", "Pesanan Dibatalkan",
];

const sheets = [
  {
    name: "Pesanan Dibuat",
    rows: [
      dailyHeader,
      ["01-06-2026-27-06-2026", "163.133.332", "2890", "56.447,52", "105455", "143765", "2,74%", "335"],
      dailyHeader,
      ["01-06-2026", "3.649.829", "66", "55.300,44", "3039", "7550", "2,17%", "13"],
      ["02-06-2026", "4.280.620", "81", "52.847,16", "3632", "7069", "2,23%", "5"],
    ],
  },
  {
    name: "Ringkasan",
    rows: [
      ["Tanggal", "Status Pesanan", "Penjualan (IDR)", "Penjualan dari halaman produk",
       "Penjualan dari Live Penjual", "Penjualan dari Video Penjual",
       "Penjualan dari Affiliate", "Penjualan dari Iklan Shopee"],
      ["01-06-2026-27-06-2026", "Pesanan Dibuat", "163.133.332", "102.546.770",
       "43.804.349", "3.602.857", "13.179.356", "141.056.789"],
    ],
  },
];

describe("parseGlobalWorkbook", () => {
  const result = parseGlobalWorkbook(sheets);

  it("reads the period from the combined cell", () => {
    expect(result.period).toEqual({ start: "2026-06-01", end: "2026-06-27" });
  });

  it("extracts daily rows (skipping the period-total row)", () => {
    const dibuat = result.daily.filter((d) => d.status === "dibuat");
    expect(dibuat).toHaveLength(2);
    expect(dibuat[0]).toMatchObject({
      date: "2026-06-01",
      total_penjualan: 3649829,
      total_pesanan: 66,
      total_pengunjung: 7550,
    });
    expect(dibuat[0].konversi).toBeCloseTo(0.0217, 4);
  });

  it("extracts sources", () => {
    const map = Object.fromEntries(result.sources.map((s) => [s.source, s.penjualan]));
    expect(map["halaman_produk"]).toBe(102546770);
    expect(map["iklan_shopee"]).toBe(141056789);
  });
});
