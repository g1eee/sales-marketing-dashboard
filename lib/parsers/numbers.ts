export function blankToNull(raw: string): string | null {
  const t = (raw ?? "").trim();
  if (t === "" || t === "-") return null;
  return t;
}

export function parseIDNumber(raw: string): number | null {
  const t = blankToNull(raw);
  if (t === null) return null;
  // remove thousands dots, convert decimal comma to dot
  const normalized = t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function parseRawNumber(raw: string): number | null {
  const t = blankToNull(raw);
  if (t === null) return null;
  const n = Number(t.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseIDPercent(raw: string): number | null {
  const t = blankToNull(raw);
  if (t === null) return null;
  const n = parseIDNumber(t.replace("%", ""));
  return n === null ? null : n / 100;
}

export function parseRawPercent(raw: string): number | null {
  const t = blankToNull(raw);
  if (t === null) return null;
  const n = parseRawNumber(t.replace("%", ""));
  return n === null ? null : n / 100;
}
