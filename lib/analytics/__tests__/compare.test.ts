import { describe, it, expect } from "vitest";
import { pctChange, compareTotals } from "@/lib/analytics/compare";
import type { Totals } from "@/lib/analytics/aggregate";

const mk = (omzet: number, pesanan: number): Totals => ({
  omzet, pesanan, pengunjung: 100, penjualan_per_pesanan: 0, konversi: 0.1, dibatalkan: 0,
});

describe("pctChange", () => {
  it("computes growth", () => {
    expect(pctChange(150, 100)).toBeCloseTo(0.5, 4);
  });
  it("computes decline", () => {
    expect(pctChange(80, 100)).toBeCloseTo(-0.2, 4);
  });
  it("returns null when previous is 0 or null", () => {
    expect(pctChange(80, 0)).toBeNull();
    expect(pctChange(80, null)).toBeNull();
  });
});

describe("compareTotals", () => {
  it("produces deltas per metric", () => {
    const c = compareTotals(mk(150, 20), mk(100, 10));
    expect(c.delta.omzet).toBeCloseTo(0.5, 4);
    expect(c.delta.pesanan).toBeCloseTo(1.0, 4);
  });
  it("null deltas when no previous period", () => {
    const c = compareTotals(mk(150, 20), null);
    expect(c.previous).toBeNull();
    expect(c.delta.omzet).toBeNull();
  });
});
