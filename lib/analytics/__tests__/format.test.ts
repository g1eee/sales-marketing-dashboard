import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  formatRupiahCompact,
  formatInt,
  formatPercent,
  formatDelta,
} from "@/lib/analytics/format";

describe("formatRupiah", () => {
  it("formats with thousands separators", () => {
    expect(formatRupiah(163133332)).toBe("Rp 163.133.332");
  });
});

describe("formatRupiahCompact", () => {
  it("abbreviates millions", () => {
    expect(formatRupiahCompact(163133332)).toBe("Rp 163,1 jt");
  });
  it("abbreviates billions", () => {
    expect(formatRupiahCompact(2450000000)).toBe("Rp 2,5 mly");
  });
  it("keeps small numbers whole", () => {
    expect(formatRupiahCompact(45000)).toBe("Rp 45.000");
  });
});

describe("formatInt", () => {
  it("groups thousands the Indonesian way", () => {
    expect(formatInt(31523)).toBe("31.523");
  });
});

describe("formatPercent", () => {
  it("formats a fraction", () => {
    expect(formatPercent(0.0274)).toBe("2,74%");
  });
  it("renders dash for null", () => {
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatDelta", () => {
  it("marks growth up", () => {
    expect(formatDelta(0.5)).toEqual({ text: "+50,0%", direction: "up" });
  });
  it("marks decline down", () => {
    expect(formatDelta(-0.2)).toEqual({ text: "-20,0%", direction: "down" });
  });
  it("none when null", () => {
    expect(formatDelta(null)).toEqual({ text: "—", direction: "none" });
  });
});
