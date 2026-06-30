import { describe, it, expect } from "vitest";
import { toHistoryRows, type RawPeriod } from "@/lib/sales/history";

const periods: RawPeriod[] = [
  {
    id: "p1",
    brand_id: "b1",
    platform: "shopee",
    period_start: "2026-06-01",
    period_end: "2026-06-30",
    source_files: ["global.xlsx", "ads.csv"],
    uploaded_by: "u1",
    created_at: "2026-06-30T10:00:00Z",
  },
  {
    id: "p2",
    brand_id: "b2",
    platform: "shopee",
    period_start: "2026-05-01",
    period_end: "2026-05-31",
    source_files: [],
    uploaded_by: null,
    created_at: "2026-05-31T10:00:00Z",
  },
];

describe("toHistoryRows", () => {
  it("maps brand and uploader names", () => {
    const rows = toHistoryRows(
      periods,
      { b1: "AMK", b2: "Brandz" },
      { u1: "Gie" },
    );
    expect(rows[0]).toMatchObject({
      brandName: "AMK",
      uploaderName: "Gie",
      sourceFiles: ["global.xlsx", "ads.csv"],
      periodStart: "2026-06-01",
    });
  });

  it("falls back to em dash for unknown brand/uploader", () => {
    const rows = toHistoryRows(periods, {}, {});
    expect(rows[1].brandName).toBe("—");
    expect(rows[1].uploaderName).toBe("—");
  });
});
