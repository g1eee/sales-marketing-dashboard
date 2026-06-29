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
