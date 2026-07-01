import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

/** Weeks (Sunday-first) covering the given month, including leading/trailing days. */
export function getMonthGrid(year: number, month: number): Date[][] {
  const first = startOfMonth(new Date(year, month - 1, 1));
  const last = endOfMonth(first);
  const gridStart = startOfWeek(first, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(last, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

/** 1-indexed grid column/span for a campaign clipped to one week, or null if no overlap. */
export function campaignSpanInWeek(
  startDate: string,
  endDate: string,
  weekStart: string,
  weekEnd: string,
): { colStart: number; colSpan: number } | null {
  if (endDate < weekStart || startDate > weekEnd) return null;
  const clippedStart = startDate > weekStart ? startDate : weekStart;
  const clippedEnd = endDate < weekEnd ? endDate : weekEnd;
  const colStart = daysBetween(weekStart, clippedStart) + 1;
  const colSpan = daysBetween(clippedStart, clippedEnd) + 1;
  return { colStart, colSpan };
}

/** Greedy interval-partitioning stack, capped at maxRows; overflow counted per column (0-indexed). */
export function layoutWeekBars<T extends { id: string; colStart: number; colSpan: number }>(
  segments: T[],
  maxRows: number,
): { placed: (T & { row: number })[]; overflowByCol: number[] } {
  const overflowByCol = new Array(7).fill(0);
  const rowEnds: number[] = [];
  const placed: (T & { row: number })[] = [];
  const sorted = [...segments].sort((a, b) => a.colStart - b.colStart);
  for (const seg of sorted) {
    const end = seg.colStart + seg.colSpan;
    let row = rowEnds.findIndex((rowEnd) => rowEnd <= seg.colStart);
    if (row === -1) row = rowEnds.length;
    if (row >= maxRows) {
      for (let c = seg.colStart; c < end; c++) overflowByCol[c - 1]++;
      continue;
    }
    rowEnds[row] = end;
    placed.push({ ...seg, row });
  }
  return { placed, overflowByCol };
}
