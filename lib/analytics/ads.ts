import type { AdsRow } from "@/lib/parsers/types";

export interface AdsAgg {
  iklan: number;
  biaya: number;
  omzet: number;
  roas: number | null;
  acos: number | null;
  klik: number;
  dilihat: number;
  ctr: number | null;
  add_to_cart: number;
  konversi: number;
  cvr: number | null;
  biaya_per_konversi: number | null;
}

const n = (x: number | null | undefined) => (typeof x === "number" ? x : 0);

export function aggregateAds(rows: AdsRow[]): AdsAgg {
  const biaya = rows.reduce((s, r) => s + n(r.biaya), 0);
  const omzet = rows.reduce((s, r) => s + n(r.omzet), 0);
  const klik = rows.reduce((s, r) => s + n(r.klik), 0);
  const dilihat = rows.reduce((s, r) => s + n(r.dilihat), 0);
  const add_to_cart = rows.reduce((s, r) => s + n(r.add_to_cart), 0);
  const konversi = rows.reduce((s, r) => s + n(r.konversi), 0);
  return {
    iklan: rows.length,
    biaya,
    omzet,
    klik,
    dilihat,
    add_to_cart,
    konversi,
    roas: biaya > 0 ? omzet / biaya : null,
    acos: omzet > 0 ? biaya / omzet : null,
    ctr: dilihat > 0 ? klik / dilihat : null,
    cvr: klik > 0 ? konversi / klik : null,
    biaya_per_konversi: konversi > 0 ? biaya / konversi : null,
  };
}
