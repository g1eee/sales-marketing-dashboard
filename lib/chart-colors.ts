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

// Categorical hues for per-brand identity on Kalender Promo (grid bars, list chips).
export const BRAND_COLORS = [
  "#5b9df0", // blue
  "#4cb782", // green
  "#d8a23a", // amber
  "#9b7fe0", // violet
  "#5fb0c4", // teal
  "#e0708f", // rose
  "#8fae4c", // lime
  "#e08a4c", // orange
] as const;

// Stable per-brand color keyed by id, computed from the full brand list (not a filtered
// subset) so a brand's color never changes depending on which filter is active.
export function assignBrandColors(brands: { id: string }[]): Map<string, string> {
  const map = new Map<string, string>();
  brands.forEach((b, i) => map.set(b.id, BRAND_COLORS[i % BRAND_COLORS.length]));
  return map;
}
