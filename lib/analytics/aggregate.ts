import type { GlobalDailyRow } from "@/lib/parsers/types";

export interface Totals {
  omzet: number;
  pesanan: number;
  pengunjung: number;
  penjualan_per_pesanan: number;
  konversi: number | null;
  dibatalkan: number;
}

export function pickStatus(
  rows: GlobalDailyRow[],
  status: GlobalDailyRow["status"],
): GlobalDailyRow[] {
  return rows.filter((r) => r.status === status);
}

export function sumDailyTotals(rows: GlobalDailyRow[]): Totals {
  const omzet = rows.reduce((s, r) => s + r.total_penjualan, 0);
  const pesanan = rows.reduce((s, r) => s + r.total_pesanan, 0);
  const pengunjung = rows.reduce((s, r) => s + (r.total_pengunjung ?? 0), 0);
  const dibatalkan = rows.reduce((s, r) => s + (r.pesanan_dibatalkan ?? 0), 0);
  return {
    omzet,
    pesanan,
    pengunjung,
    dibatalkan,
    penjualan_per_pesanan: pesanan > 0 ? Math.round(omzet / pesanan) : 0,
    konversi: pengunjung > 0 ? pesanan / pengunjung : null,
  };
}
