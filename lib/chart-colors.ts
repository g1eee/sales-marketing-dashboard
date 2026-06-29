/**
 * Monochrome chart palette as literal hex (Recharts writes SVG fill/stroke
 * attributes, which don't resolve `var(--…)`). Tuned for the dark default theme.
 */
export const CHART = {
  line: "#e4e4e7",
  grid: "rgba(140,140,140,0.22)",
  axis: "#8a8a8a",
} as const;

export const SOURCE_COLORS = [
  "#e4e4e7",
  "#a1a1aa",
  "#71717a",
  "#52525b",
  "#3f3f46",
];
