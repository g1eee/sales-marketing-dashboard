import { parseRawNumber, parseRawPercent, blankToNull } from "@/lib/parsers/numbers";
import type { AdsRow } from "@/lib/parsers/types";

// Minimal CSV splitter (Shopee ads export uses simple comma rows, no quoted commas).
function splitCsvLine(line: string): string[] {
  return line.split(",");
}

export function parseAdsCsv(text: string): AdsRow[] {
  const lines = (text ?? "").replace(/^﻿/, "").split(/\r?\n/);
  const headerIdx = lines.findIndex((l) =>
    l.toLowerCase().startsWith("urutan,nama iklan"),
  );
  if (headerIdx < 0) return [];
  const header = splitCsvLine(lines[headerIdx]).map((h) => h.toLowerCase().trim());
  const idx = (needle: string) => header.findIndex((h) => h.includes(needle));
  const exact = (needle: string) => header.findIndex((h) => h === needle);

  const c = {
    nama: idx("nama iklan"),
    status: idx("status"),
    jenis: idx("jenis iklan"),
    kodeProduk: idx("kode produk"),
    modeBidding: idx("mode bidding"),
    dilihat: idx("dilihat"),
    klik: exact("jumlah klik"),
    ctr: exact("persentase klik"),
    atc: exact("add to cart"),
    atcRate: idx("add to cart rate"),
    konversi: exact("konversi"),
    konversiLangsung: exact("konversi langsung"),
    cvr: exact("tingkat konversi"),
    biayaPerKonversi: exact("biaya per konversi"),
    produkTerjual: idx("produk terjual"),
    omzet: idx("omzet penjualan"),
    omzetLangsung: idx("penjualan langsung"),
    biaya: exact("biaya"),
    roas: idx("efektifitas iklan"),
    acos: exact("acos"),
    voucher: idx("voucher amount"),
  };

  const at = (f: string[], i: number) => (i >= 0 ? (f[i] ?? "") : "");

  const out: AdsRow[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    if (line.trim() === "") continue;
    const f = splitCsvLine(line);
    const nama = (f[c.nama] ?? "").trim();
    if (!nama) continue;
    out.push({
      nama_iklan: nama,
      status: blankToNull(at(f, c.status)),
      jenis_iklan: blankToNull(at(f, c.jenis)),
      dilihat: parseRawNumber(at(f, c.dilihat)),
      klik: parseRawNumber(at(f, c.klik)),
      ctr: parseRawPercent(at(f, c.ctr)),
      add_to_cart: parseRawNumber(at(f, c.atc)),
      konversi: parseRawNumber(at(f, c.konversi)),
      cvr: parseRawPercent(at(f, c.cvr)),
      biaya_per_konversi: parseRawNumber(at(f, c.biayaPerKonversi)),
      produk_terjual: parseRawNumber(at(f, c.produkTerjual)),
      omzet: parseRawNumber(at(f, c.omzet)),
      biaya: parseRawNumber(at(f, c.biaya)),
      roas: parseRawNumber(at(f, c.roas)),
      acos: parseRawPercent(at(f, c.acos)),
      voucher: parseRawNumber(at(f, c.voucher)),
      extra: {
        mode_bidding: blankToNull(at(f, c.modeBidding)),
        kode_produk: blankToNull(at(f, c.kodeProduk)),
        konversi_langsung: parseRawNumber(at(f, c.konversiLangsung)),
        omzet_langsung: parseRawNumber(at(f, c.omzetLangsung)),
        atc_rate: parseRawPercent(at(f, c.atcRate)),
      },
    });
  }
  return out;
}
