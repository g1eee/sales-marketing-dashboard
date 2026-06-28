import { describe, it, expect } from "vitest";
import { normalizeBrandName, validateBrandName } from "@/lib/brands";

describe("normalizeBrandName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeBrandName("  Kalova   Official ")).toBe("Kalova Official");
  });
});

describe("validateBrandName", () => {
  it("accepts a normal name", () => {
    expect(validateBrandName("Kalova Official")).toEqual({
      ok: true,
      value: "Kalova Official",
    });
  });
  it("rejects empty", () => {
    const r = validateBrandName("   ");
    expect(r.ok).toBe(false);
  });
  it("rejects too long", () => {
    const r = validateBrandName("x".repeat(81));
    expect(r.ok).toBe(false);
  });
});
