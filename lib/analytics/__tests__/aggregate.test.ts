import { describe, it, expect } from "vitest";
import { pickStatus, sumDailyTotals } from "@/lib/analytics/aggregate";
import type { GlobalDailyRow } from "@/lib/parsers/types";

const rows: GlobalDailyRow[] = [
  { date: "2026-01-01", status: "dibuat", total_penjualan: 1000, total_pesanan: 10, penjualan_per_pesanan: 100, produk_diklik: 5, total_pengunjung: 200, konversi: 0.05, pesanan_dibatalkan: 1 },
  { date: "2026-01-02", status: "dibuat", total_penjualan: 3000, total_pesanan: 30, penjualan_per_pesanan: 100, produk_diklik: 9, total_pengunjung: 300, konversi: 0.1, pesanan_dibatalkan: 2 },
  { date: "2026-01-01", status: "dibayar", total_penjualan: 999, total_pesanan: 9, penjualan_per_pesanan: 111, produk_diklik: 5, total_pengunjung: 200, konversi: 0.045, pesanan_dibatalkan: 0 },
];

describe("pickStatus", () => {
  it("filters by status", () => {
    expect(pickStatus(rows, "dibuat")).toHaveLength(2);
  });
});

describe("sumDailyTotals", () => {
  const t = sumDailyTotals(pickStatus(rows, "dibuat"));
  it("sums omzet and pesanan", () => {
    expect(t.omzet).toBe(4000);
    expect(t.pesanan).toBe(40);
    expect(t.pengunjung).toBe(500);
    expect(t.dibatalkan).toBe(3);
  });
  it("recomputes average order value", () => {
    expect(t.penjualan_per_pesanan).toBe(100);
  });
  it("recomputes conversion as pesanan/pengunjung", () => {
    expect(t.konversi).toBeCloseTo(40 / 500, 4);
  });
  it("handles empty input", () => {
    const e = sumDailyTotals([]);
    expect(e.omzet).toBe(0);
    expect(e.konversi).toBeNull();
  });
});
