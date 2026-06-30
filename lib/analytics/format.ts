const idNum = new Intl.NumberFormat("id-ID");

export function formatInt(n: number): string {
  return idNum.format(Math.round(n));
}

export function formatRupiah(n: number): string {
  return `Rp ${idNum.format(Math.round(n))}`;
}

/** Compact rupiah for tight spots (chart axes, dense cells): "Rp 163,1 jt". */
export function formatRupiahCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000)
    return `Rp ${(n / 1_000_000_000).toFixed(1).replace(".", ",")} mly`;
  if (abs >= 1_000_000)
    return `Rp ${(n / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  return formatRupiah(n);
}

// Shared compacting core: tapering precision (200 → "200", 20,9 → "20,9", 2,97 → "2,97").
function compact(n: number): string {
  const abs = Math.abs(n);
  const tier = (div: number, suffix: string) => {
    const x = n / div;
    const dec = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2;
    return `${x.toFixed(dec).replace(".", ",")}${suffix}`;
  };
  if (abs >= 1_000_000_000) return tier(1_000_000_000, "B");
  if (abs >= 1_000_000) return tier(1_000_000, "M");
  if (abs >= 1_000) return tier(1_000, "k");
  return formatInt(n);
}

/** Ultra-compact headline money: "Rp 466M", "Rp 36,6M", "Rp 2,97k". */
export function formatRupiahShort(n: number): string {
  return `Rp ${compact(n)}`;
}

/** Ultra-compact headline count: "134k", "1,2M". */
export function formatIntShort(n: number): string {
  return compact(n);
}

/** KPI headline + exact detail; detail omitted when no abbreviation occurred. */
export function shortWithDetail(
  n: number,
  kind: "rupiah" | "int",
): { value: string; detail?: string } {
  const full = kind === "rupiah" ? formatRupiah(n) : formatInt(n);
  const short = kind === "rupiah" ? formatRupiahShort(n) : formatIntShort(n);
  return short === full ? { value: full } : { value: short, detail: full };
}

export function formatPercent(fraction: number | null, digits = 2): string {
  if (fraction === null) return "—";
  return `${(fraction * 100).toFixed(digits).replace(".", ",")}%`;
}

export function formatDelta(
  fraction: number | null,
): { text: string; direction: "up" | "down" | "flat" | "none" } {
  if (fraction === null) return { text: "—", direction: "none" };
  const pct = (fraction * 100).toFixed(1).replace(".", ",");
  if (fraction > 0) return { text: `+${pct}%`, direction: "up" };
  if (fraction < 0) return { text: `${pct}%`, direction: "down" };
  return { text: `${pct}%`, direction: "flat" };
}
