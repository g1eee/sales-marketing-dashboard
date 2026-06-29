export function parseDMY(s: string): string | null {
  const m = (s ?? "").trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

export function parsePeriodString(
  s: string,
): { start: string; end: string } | null {
  const m = (s ?? "")
    .trim()
    .match(/^(\d{2}-\d{2}-\d{4})-(\d{2}-\d{2}-\d{4})$/);
  if (!m) return null;
  const start = parseDMY(m[1]);
  const end = parseDMY(m[2]);
  if (!start || !end) return null;
  return { start, end };
}
