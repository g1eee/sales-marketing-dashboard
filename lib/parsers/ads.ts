import { parseRawNumber, parseRawPercent, blankToNull } from "@/lib/parsers/numbers";
import type { AdsRow } from "@/lib/parsers/types";

// Minimal CSV splitter (Shopee ads export uses simple comma rows, no quoted commas).
function splitCsvLine(line: string): string[] {
  return line.split(",");
}

export function parseAdsCsv(text: string): AdsRow[] {
  const lines = (text ?? "").replace(/^﻿/, "").split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.toLowerCase().startsWith("urutan,nama iklan"));
  if (headerIdx < 0) return [];
  const header = splitCsvLine(lines[headerIdx]).map((h) => h.toLowerCase().trim());
  const idx = (needle: string) => header.findIndex((h) => h.includes(needle));

  const c = {
    nama: idx("nama iklan"),
    status: idx("status"),
    jenis: idx("jenis iklan"),
    dilihat: idx("dilihat"),
    klik: header.findIndex((h) => h === "jumlah klik"),
    ctr: header.findIndex((h) => h === "persentase klik"),
    atc: idx("add to cart"),
    konversi: header.findIndex((h) => h === "konversi"),
    cvr: header.findIndex((h) => h === "tingkat konversi"),
    biayaPerKonversi: header.findIndex((h) => h === "biaya per konversi"),
    produkTerjual: idx("produk terjual"),
    omzet: idx("omzet penjualan"),
    biaya: header.findIndex((h) => h === "biaya"),
    roas: idx("efektifitas iklan"),
    acos: header.findIndex((h) => h === "acos"),
    voucher: idx("voucher amount"),
  };

  const out: AdsRow[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    if (line.trim() === "") continue;
    const f = splitCsvLine(line);
    const nama = (f[c.nama] ?? "").trim();
    if (!nama) continue;
    out.push({
      nama_iklan: nama,
      status: blankToNull(f[c.status] ?? ""),
      jenis_iklan: blankToNull(f[c.jenis] ?? ""),
      dilihat: parseRawNumber(f[c.dilihat] ?? ""),
      klik: parseRawNumber(f[c.klik] ?? ""),
      ctr: parseRawPercent(f[c.ctr] ?? ""),
      add_to_cart: parseRawNumber(f[c.atc] ?? ""),
      konversi: parseRawNumber(f[c.konversi] ?? ""),
      cvr: parseRawPercent(f[c.cvr] ?? ""),
      biaya_per_konversi: parseRawNumber(f[c.biayaPerKonversi] ?? ""),
      produk_terjual: parseRawNumber(f[c.produkTerjual] ?? ""),
      omzet: parseRawNumber(f[c.omzet] ?? ""),
      biaya: parseRawNumber(f[c.biaya] ?? ""),
      roas: parseRawNumber(f[c.roas] ?? ""),
      acos: parseRawPercent(f[c.acos] ?? ""),
      voucher: parseRawNumber(f[c.voucher] ?? ""),
      extra: {},
    });
  }
  return out;
}
