import { parseIDNumber, parseIDPercent } from "@/lib/parsers/numbers";
import { parsePeriodString, parseDMY } from "@/lib/parsers/period";
import type { ParsedGlobal, GlobalDailyRow, SourceRow } from "@/lib/parsers/types";

const STATUS_BY_SHEET: Record<string, GlobalDailyRow["status"]> = {
  "pesanan dibuat": "dibuat",
  "pesanan siap dikirim": "siap_dikirim",
  "pesanan dibayar": "dibayar",
};

const SOURCE_COLUMNS: { header: string; key: string }[] = [
  { header: "penjualan dari halaman produk", key: "halaman_produk" },
  { header: "penjualan dari live penjual", key: "live" },
  { header: "penjualan dari video penjual", key: "video" },
  { header: "penjualan dari affiliate", key: "affiliate" },
  { header: "penjualan dari iklan shopee", key: "iklan_shopee" },
];

function isDailyHeader(row: string[]): boolean {
  const t = row.map((c) => (c ?? "").toLowerCase());
  return t[0] === "tanggal" && t.some((c) => c.includes("total penjualan"));
}

export function parseGlobalWorkbook(
  sheets: { name: string; rows: string[][] }[],
): ParsedGlobal {
  const daily: GlobalDailyRow[] = [];
  let period: ParsedGlobal["period"] = null;
  let sources: SourceRow[] = [];

  for (const sheet of sheets) {
    const status = STATUS_BY_SHEET[sheet.name.trim().toLowerCase()];
    if (status) {
      for (const row of sheet.rows) {
        const first = (row[0] ?? "").trim();
        if (isDailyHeader(row)) continue;
        const periodHit = parsePeriodString(first);
        if (periodHit) {
          period ??= periodHit;
          continue; // period-total row, not a day
        }
        const iso = parseDMY(first);
        if (!iso) continue;
        daily.push({
          date: iso,
          status,
          total_penjualan: parseIDNumber(row[1]) ?? 0,
          total_pesanan: parseIDNumber(row[2]) ?? 0,
          penjualan_per_pesanan: parseIDNumber(row[3]) ?? 0,
          produk_diklik: parseIDNumber(row[4]),
          total_pengunjung: parseIDNumber(row[5]),
          konversi: parseIDPercent(row[6]),
          pesanan_dibatalkan: parseIDNumber(row[7]),
        });
      }
    }

    if (sources.length === 0) {
      const headerIdx = sheet.rows.findIndex((r) =>
        r.some((c) => (c ?? "").toLowerCase().includes("penjualan dari halaman produk")),
      );
      if (headerIdx >= 0) {
        const header = sheet.rows[headerIdx].map((c) => (c ?? "").toLowerCase().trim());
        const dataRow = sheet.rows[headerIdx + 1];
        if (dataRow) {
          if (!period) {
            const hit = parsePeriodString((dataRow[0] ?? "").trim());
            if (hit) period = hit;
          }
          sources = SOURCE_COLUMNS.flatMap(({ header: h, key }) => {
            const col = header.findIndex((c) => c === h);
            if (col < 0) return [];
            return [{ source: key, penjualan: parseIDNumber(dataRow[col]) ?? 0 }];
          });
        }
      }
    }
  }

  return { period, daily, sources };
}
