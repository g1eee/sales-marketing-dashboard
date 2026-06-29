import { describe, it, expect } from "vitest";
import { aggregateAds } from "@/lib/analytics/ads";
import type { AdsRow } from "@/lib/parsers/types";

const mk = (
  biaya: number,
  omzet: number,
  klik: number,
  dilihat: number,
  konversi: number,
): AdsRow => ({
  nama_iklan: "x",
  status: null,
  jenis_iklan: null,
  dilihat,
  klik,
  ctr: null,
  add_to_cart: null,
  konversi,
  cvr: null,
  biaya_per_konversi: null,
  produk_terjual: null,
  omzet,
  biaya,
  roas: null,
  acos: null,
  voucher: null,
  extra: {},
});

describe("aggregateAds", () => {
  const agg = aggregateAds([mk(100, 1000, 50, 1000, 5), mk(300, 600, 30, 500, 3)]);
  it("sums spend and revenue", () => {
    expect(agg.iklan).toBe(2);
    expect(agg.biaya).toBe(400);
    expect(agg.omzet).toBe(1600);
    expect(agg.klik).toBe(80);
    expect(agg.dilihat).toBe(1500);
    expect(agg.konversi).toBe(8);
  });
  it("computes blended ROAS, ACOS, CTR, CVR", () => {
    expect(agg.roas).toBeCloseTo(4, 4); // 1600/400
    expect(agg.acos).toBeCloseTo(0.25, 4); // 400/1600
    expect(agg.ctr).toBeCloseTo(80 / 1500, 4);
    expect(agg.cvr).toBeCloseTo(0.1, 4); // 8/80
  });
  it("guards divide-by-zero", () => {
    const e = aggregateAds([]);
    expect(e.roas).toBeNull();
    expect(e.acos).toBeNull();
    expect(e.ctr).toBeNull();
  });
});
