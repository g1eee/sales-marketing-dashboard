import { describe, it, expect } from "vitest";
import {
  blankToNull,
  parseIDNumber,
  parseRawNumber,
  parseIDPercent,
  parseRawPercent,
} from "@/lib/parsers/numbers";

describe("blankToNull", () => {
  it("maps empty/dash/space to null", () => {
    expect(blankToNull("")).toBeNull();
    expect(blankToNull("-")).toBeNull();
    expect(blankToNull("  ")).toBeNull();
  });
  it("keeps real values", () => {
    expect(blankToNull("0")).toBe("0");
  });
});

describe("parseIDNumber", () => {
  it("parses thousands with dots", () => {
    expect(parseIDNumber("163.133.332")).toBe(163133332);
  });
  it("parses decimals with comma", () => {
    expect(parseIDNumber("80.315,80")).toBeCloseTo(80315.8, 2);
  });
  it("returns null for dash", () => {
    expect(parseIDNumber("-")).toBeNull();
  });
});

describe("parseRawNumber", () => {
  it("parses integers", () => {
    expect(parseRawNumber("134079")).toBe(134079);
  });
  it("parses dot decimals", () => {
    expect(parseRawNumber("2373.96")).toBeCloseTo(2373.96, 2);
  });
});

describe("percent", () => {
  it("parses ID percent to fraction", () => {
    expect(parseIDPercent("16,06%")).toBeCloseTo(0.1606, 4);
  });
  it("parses raw percent to fraction", () => {
    expect(parseRawPercent("4.33%")).toBeCloseTo(0.0433, 4);
  });
  it("dash -> null", () => {
    expect(parseIDPercent("-")).toBeNull();
  });
});
