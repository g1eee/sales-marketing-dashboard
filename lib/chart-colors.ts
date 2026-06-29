/**
 * Chart palette as literal hex (Recharts writes SVG fill/stroke attributes,
 * which don't resolve `var(--…)`). Neutral base + blue accent for single-series
 * trends; the source donut uses distinct categorical hues for legibility.
 */
export const CHART = {
  line: "#5b9df0", // blue accent — trend lines / sparklines
  grid: "rgba(140,140,140,0.22)",
  axis: "#8a8a8a",
} as const;

// Distinct hues per sales channel (not all-blue) — categorical, easy to tell apart.
export const SOURCE_COLORS = [
  "#5b9df0", // Halaman Produk — blue
  "#4cb782", // Live — green
  "#d8a23a", // Video — amber
  "#9b7fe0", // Affiliate — violet
  "#5fb0c4", // (spare) teal
];
