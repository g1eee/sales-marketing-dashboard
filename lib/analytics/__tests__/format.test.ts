import { describe, it, expect } from "vitest";
import {
  formatRupiah,
  formatRupiahCompact,
  formatRupiahShort,
  formatIntShort,
  shortWithDetail,
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

describe("formatRupiahShort", () => {
  it("compacts to k/M/B with tapering precision", () => {
    expect(formatRupiahShort(200_000_000)).toBe("Rp 200M");
    expect(formatRupiahShort(20_900_000)).toBe("Rp 20,9M");
    expect(formatRupiahShort(2_968)).toBe("Rp 2,97k");
    expect(formatRupiahShort(466_018_130)).toBe("Rp 466M");
    expect(formatRupiahShort(1_250_000_000)).toBe("Rp 1,25B");
  });
  it("keeps sub-thousand whole", () => {
    expect(formatRupiahShort(950)).toBe("Rp 950");
  });
});

describe("formatIntShort", () => {
  it("compacts counts without the Rp prefix", () => {
    expect(formatIntShort(134079)).toBe("134k");
    expect(formatIntShort(1523)).toBe("1,52k");
    expect(formatIntShort(950)).toBe("950");
  });
});

describe("shortWithDetail", () => {
  it("returns compact value + exact detail when abbreviated", () => {
    expect(shortWithDetail(466018130, "rupiah")).toEqual({
      value: "Rp 466M",
      detail: "Rp 466.018.130",
    });
    expect(shortWithDetail(134079, "int")).toEqual({
      value: "134k",
      detail: "134.079",
    });
  });
  it("omits detail when no abbreviation happened", () => {
    expect(shortWithDetail(59, "int")).toEqual({ value: "59" });
    expect(shortWithDetail(950, "rupiah")).toEqual({ value: "Rp 950" });
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
