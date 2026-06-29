import { describe, it, expect } from "vitest";
import { aggregateProducts } from "@/lib/analytics/product";
import type { ProductSummaryRow } from "@/lib/parsers/types";

const mk = (
  penjualan: number,
  pesanan: number,
  units: number,
  pembeli: number,
  repeat: number,
): ProductSummaryRow => ({
  kode_produk: "x",
  product_name: "x",
  penjualan,
  dilihat: null,
  diklik: null,
  total_pesanan: pesanan,
  persentase_klik: null,
  konversi: null,
  total_pembeli: pembeli,
  extra: { units, repeat_rate: repeat },
});

describe("aggregateProducts", () => {
  const agg = aggregateProducts([mk(1000, 10, 12, 8, 0.1), mk(3000, 30, 40, 20, 0.2)]);
  it("sums omzet, units, pembeli, pesanan", () => {
    expect(agg.produk).toBe(2);
    expect(agg.omzet).toBe(4000);
    expect(agg.terjual).toBe(52);
    expect(agg.pembeli).toBe(28);
    expect(agg.pesanan).toBe(40);
  });
  it("weights repeat-order rate by pesanan", () => {
    // (0.1*10 + 0.2*30) / 40 = 0.175
    expect(agg.repeat_rate).toBeCloseTo(0.175, 4);
  });
  it("handles empty input", () => {
    const e = aggregateProducts([]);
    expect(e.omzet).toBe(0);
    expect(e.repeat_rate).toBeNull();
  });
});
