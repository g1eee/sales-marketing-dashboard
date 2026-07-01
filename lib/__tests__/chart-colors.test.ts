import { describe, it, expect } from "vitest";
import { BRAND_COLORS, assignBrandColors } from "@/lib/chart-colors";

describe("assignBrandColors", () => {
  it("gives each brand a color from BRAND_COLORS, cycling by list order", () => {
    const brands = [{ id: "b1" }, { id: "b2" }, { id: "b3" }];
    const map = assignBrandColors(brands);
    expect(map.get("b1")).toBe(BRAND_COLORS[0]);
    expect(map.get("b2")).toBe(BRAND_COLORS[1]);
    expect(map.get("b3")).toBe(BRAND_COLORS[2]);
  });

  it("cycles back to the start when there are more brands than colors", () => {
    const brands = Array.from({ length: BRAND_COLORS.length + 2 }, (_, i) => ({ id: `b${i}` }));
    const map = assignBrandColors(brands);
    expect(map.get(`b${BRAND_COLORS.length}`)).toBe(BRAND_COLORS[0]);
    expect(map.get(`b${BRAND_COLORS.length + 1}`)).toBe(BRAND_COLORS[1]);
  });
});
