/**
 * Emerald Ledger chart palette as literal hex. Recharts writes colors to SVG
 * `fill`/`stroke` *attributes*, which do NOT resolve `var(--…)` — so charts must
 * use literals, not the CSS tokens. Tuned to read on the light canvas.
 */
export const CHART = {
  emerald: "#12936a",
  teal: "#189e94",
  amber: "#c0871e",
  mint: "#76c6a8",
  deep: "#2d6a60",
  grid: "#e7ece9",
  axis: "#6b7a74",
} as const;

export const SOURCE_COLORS = [
  CHART.emerald,
  CHART.teal,
  CHART.amber,
  CHART.mint,
  CHART.deep,
];
