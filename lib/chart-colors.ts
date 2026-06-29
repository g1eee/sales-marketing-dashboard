/**
 * Blue-accent chart palette as literal hex (Recharts writes SVG fill/stroke
 * attributes, which don't resolve `var(--…)`). Neutral base, one consistent
 * blue accent; multi-series uses a blue ramp. Tuned for the dark default theme.
 */
export const CHART = {
  line: "#5b9df0",
  grid: "rgba(140,140,140,0.22)",
  axis: "#8a8a8a",
} as const;

export const SOURCE_COLORS = [
  "#5b9df0",
  "#7fb3f5",
  "#3f7fd1",
  "#a9cbf7",
  "#2c5aa0",
];
