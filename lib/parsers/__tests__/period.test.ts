import { describe, it, expect } from "vitest";
import { parseDMY, parsePeriodString } from "@/lib/parsers/period";

describe("parseDMY", () => {
  it("converts dd-mm-yyyy to ISO", () => {
    expect(parseDMY("01-06-2026")).toBe("2026-06-01");
  });
  it("returns null for junk", () => {
    expect(parseDMY("not a date")).toBeNull();
  });
});

describe("parsePeriodString", () => {
  it("splits a combined period string", () => {
    expect(parsePeriodString("01-06-2026-27-06-2026")).toEqual({
      start: "2026-06-01",
      end: "2026-06-27",
    });
  });
  it("returns null when not a period", () => {
    expect(parsePeriodString("01-06-2026")).toBeNull();
  });
});
