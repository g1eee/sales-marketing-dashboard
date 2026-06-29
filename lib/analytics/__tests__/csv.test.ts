import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/analytics/csv";

describe("toCsv", () => {
  it("builds a csv with header and rows", () => {
    const out = toCsv(["a", "b"], [[1, "x"], [2, null]]);
    expect(out).toBe("a,b\n1,x\n2,");
  });
  it("quotes values containing commas", () => {
    const out = toCsv(["name"], [["Kalova, Inc"]]);
    expect(out).toBe('name\n"Kalova, Inc"');
  });
});
