/** Pure date formatting shared by server pages and client controls. */
export function formatDateShort(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatPeriodRange(start: string, end: string): string {
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}
