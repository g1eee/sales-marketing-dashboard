import { parseIDNumber, parseIDPercent } from "@/lib/parsers/numbers";
import { parsePeriodString, parseDMY } from "@/lib/parsers/period";
import type {
  ParsedGlobal,
  GlobalDailyRow,
  GlobalChannelRow,
  SourceRow,
} from "@/lib/parsers/types";

type Status = GlobalDailyRow["status"];

const STATUS_BY_SHEET: Record<string, Status> = {
  "pesanan dibuat": "dibuat",
  "pesanan siap dikirim": "siap_dikirim",
  "pesanan dibayar": "dibayar",
};

// "Pesanan Dibuat" / "Pesanan Siap Dikirim" / "Pesanan Dibayar" cell inside a sheet.
const STATUS_BY_LABEL: Record<string, Status> = {
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

// Per-channel total rows (rasio 100%) in a visit-source sheet.
const CHANNEL_MAP: Record<string, string> = {
  "halaman produk": "halaman_produk",
  "live penjual": "live",
  "video penjual": "video",
  affiliate: "affiliate",
};

function isDailyHeader(row: string[]): boolean {
  const t = row.map((c) => (c ?? "").toLowerCase());
  return t[0] === "tanggal" && t.some((c) => c.includes("total penjualan"));
}

function round(n: number | null): number | null {
  return n === null ? null : Math.round(n);
}

/** Read the order status named inside a visit-source sheet (e.g. "Pesanan Dibuat"). */
function detectStatus(rows: string[][]): Status | null {
  for (const row of rows.slice(0, 4)) {
    for (const c of row) {
      const s = STATUS_BY_LABEL[(c ?? "").toLowerCase().trim()];
      if (s) return s;
    }
  }
  return null;
}

/** Parse the per-channel total rows from a visit-source ("Asal/Sumber Kunjungan") sheet. */
function parseChannels(rows: string[][], status: Status): GlobalChannelRow[] {
  const headerIdx = rows.findIndex((r) =>
    r.some((c) => (c ?? "").toLowerCase().includes("jumlah produk dilihat")),
  );
  if (headerIdx < 0) return [];
  const header = rows[headerIdx].map((c) => (c ?? "").toLowerCase());
  const idx = (needle: string) => header.findIndex((h) => h.includes(needle));
  const col = {
    penjualan: idx("penjualan (idr)"),
    dilihat: idx("jumlah produk dilihat"),
    diklik: idx("produk diklik"),
    pesanan: idx("total pesanan"),
    ctr: idx("persentase klik"),
    cvr: idx("tingkat konversi pesanan"),
    pembeli: idx("total pembeli"),
    unikDilihat: idx("produk unik dilihat"),
    unikDiklik: idx("produk unik diklik"),
  };
  const at = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "") : "");

  const out: GlobalChannelRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const channel = CHANNEL_MAP[(row[0] ?? "").toLowerCase().trim()];
    if (!channel || seen.has(channel)) continue;
    // The channel total row has a Penjualan value; the section-header row is blank.
    if (String(at(row, col.penjualan)).trim() === "") continue;
    seen.add(channel);
    out.push({
      channel,
      status,
      penjualan: parseIDNumber(at(row, col.penjualan)) ?? 0,
      dilihat: parseIDNumber(at(row, col.dilihat)),
      diklik: parseIDNumber(at(row, col.diklik)),
      unik_dilihat: parseIDNumber(at(row, col.unikDilihat)),
      unik_diklik: parseIDNumber(at(row, col.unikDiklik)),
      ctr: parseIDPercent(at(row, col.ctr)),
      cvr: parseIDPercent(at(row, col.cvr)),
      pesanan: round(parseIDNumber(at(row, col.pesanan))),
      pembeli: parseIDNumber(at(row, col.pembeli)),
    });
  }
  return out;
}

export function parseGlobalWorkbook(
  sheets: { name: string; rows: string[][] }[],
): ParsedGlobal {
  const daily: GlobalDailyRow[] = [];
  let period: ParsedGlobal["period"] = null;
  let sources: SourceRow[] = [];
  let channels: GlobalChannelRow[] = [];
  const statusBuyers: Partial<
    Record<
      Status,
      { baru: number | null; lama: number | null; potensi: number | null }
    >
  > = {};

  for (const sheet of sheets) {
    const status = STATUS_BY_SHEET[sheet.name.trim().toLowerCase()];
    if (status) {
      for (const row of sheet.rows) {
        const first = (row[0] ?? "").trim();
        if (isDailyHeader(row)) continue;
        const periodHit = parsePeriodString(first);
        if (periodHit) {
          period ??= periodHit;
          statusBuyers[status] = {
            baru: parseIDNumber(row[12]),
            lama: parseIDNumber(row[13]),
            potensi: parseIDNumber(row[14]),
          };
          continue; // period-total row, not a day
        }
        const iso = parseDMY(first);
        if (!iso) continue;
        const buyers = statusBuyers[status];
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
          pembeli_baru: buyers?.baru ?? null,
          pembeli_lama: buyers?.lama ?? null,
          potensi_pembeli: buyers?.potensi ?? null,
        });
      }
    }

    if (sources.length === 0) {
      const headerIdx = sheet.rows.findIndex((r) =>
        r.some((c) =>
          (c ?? "").toLowerCase().includes("penjualan dari halaman produk"),
        ),
      );
      if (headerIdx >= 0) {
        const header = sheet.rows[headerIdx].map((c) =>
          (c ?? "").toLowerCase().trim(),
        );
        const dataRow = sheet.rows[headerIdx + 1];
        if (dataRow) {
          if (!period) {
            const hit = parsePeriodString((dataRow[0] ?? "").trim());
            if (hit) period = hit;
          }
          sources = SOURCE_COLUMNS.flatMap(({ header: h, key }) => {
            const colIdx = header.findIndex((c) => c === h);
            if (colIdx < 0) return [];
            return [{ source: key, penjualan: parseIDNumber(dataRow[colIdx]) ?? 0 }];
          });
        }
      }
    }

    // Per-channel performance comes from the visit-source sheets, one per status.
    if (/kunjungan/i.test(sheet.name)) {
      const st = detectStatus(sheet.rows);
      if (st) channels = channels.concat(parseChannels(sheet.rows, st));
    }
  }

  return { period, daily, sources, channels };
}
