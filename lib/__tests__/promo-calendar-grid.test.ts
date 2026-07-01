import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import { getMonthGrid, campaignSpanInWeek, layoutWeekBars } from "@/lib/promo-calendar-grid";

describe("getMonthGrid", () => {
  it("includes leading/trailing days so every week has 7 days (Jul 2026 starts on a Wednesday)", () => {
    const weeks = getMonthGrid(2026, 7);
    expect(weeks).toHaveLength(5);
    for (const w of weeks) expect(w).toHaveLength(7);
    expect(format(weeks[0][0], "yyyy-MM-dd")).toBe("2026-06-28");
    expect(format(weeks[4][6], "yyyy-MM-dd")).toBe("2026-08-01");
  });

  it("covers the whole month with no gaps (Feb 2026 fits exactly, no leap day)", () => {
    const weeks = getMonthGrid(2026, 2);
    expect(weeks).toHaveLength(4);
    const flat = weeks.flat().map((d) => format(d, "yyyy-MM-dd"));
    expect(flat[0]).toBe("2026-02-01");
    expect(flat[flat.length - 1]).toBe("2026-02-28");
  });
});

describe("campaignSpanInWeek", () => {
  const weekStart = "2026-07-05"; // Sunday
  const weekEnd = "2026-07-11"; // Saturday

  it("returns null when the campaign doesn't overlap the week", () => {
    expect(campaignSpanInWeek("2026-06-01", "2026-06-30", weekStart, weekEnd)).toBeNull();
  });

  it("spans the full week when the campaign covers it entirely", () => {
    expect(campaignSpanInWeek("2026-07-01", "2026-07-20", weekStart, weekEnd)).toEqual({
      colStart: 1,
      colSpan: 7,
    });
  });

  it("clips to the week when the campaign starts mid-week (Tue = col 3)", () => {
    expect(campaignSpanInWeek("2026-07-07", "2026-07-20", weekStart, weekEnd)).toEqual({
      colStart: 3,
      colSpan: 5,
    });
  });

  it("handles a single-day campaign (Wed = col 4)", () => {
    expect(campaignSpanInWeek("2026-07-08", "2026-07-08", weekStart, weekEnd)).toEqual({
      colStart: 4,
      colSpan: 1,
    });
  });
});

describe("layoutWeekBars", () => {
  it("keeps non-overlapping segments on the same row", () => {
    const { placed, overflowByCol } = layoutWeekBars(
      [
        { id: "a", colStart: 1, colSpan: 2 },
        { id: "b", colStart: 3, colSpan: 2 },
      ],
      3,
    );
    expect(placed).toEqual([
      { id: "a", colStart: 1, colSpan: 2, row: 0 },
      { id: "b", colStart: 3, colSpan: 2, row: 0 },
    ]);
    expect(overflowByCol).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("stacks overlapping segments on separate rows", () => {
    const { placed } = layoutWeekBars(
      [
        { id: "a", colStart: 1, colSpan: 3 },
        { id: "b", colStart: 2, colSpan: 3 },
      ],
      3,
    );
    expect(placed.find((s) => s.id === "a")!.row).toBe(0);
    expect(placed.find((s) => s.id === "b")!.row).toBe(1);
  });

  it("overflows into overflowByCol once maxRows is exceeded", () => {
    const segments = ["a", "b", "c", "d"].map((id) => ({ id, colStart: 1, colSpan: 1 }));
    const { placed, overflowByCol } = layoutWeekBars(segments, 3);
    expect(placed).toHaveLength(3);
    expect(overflowByCol[0]).toBe(1);
  });
});
