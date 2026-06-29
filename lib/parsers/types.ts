export type FileKind = "global" | "product" | "ads";

export interface GlobalDailyRow {
  date: string;
  status: "dibuat" | "siap_dikirim" | "dibayar";
  total_penjualan: number;
  total_pesanan: number;
  penjualan_per_pesanan: number;
  produk_diklik: number | null;
  total_pengunjung: number | null;
  konversi: number | null;
  pesanan_dibatalkan: number | null;
  // Period totals for the status (stamped on each daily row, NOT summed —
  // returning/potential buyers repeat across days so summing over-counts).
  pembeli_baru?: number | null;
  pembeli_lama?: number | null;
  potensi_pembeli?: number | null;
}

/** Per-channel performance per order status (from the visit-source sheets). */
export interface GlobalChannelRow {
  channel: string;
  status: "dibuat" | "siap_dikirim" | "dibayar";
  penjualan: number;
  dilihat: number | null; // Jumlah Produk Dilihat
  diklik: number | null;
  unik_dilihat: number | null;
  unik_diklik: number | null;
  ctr: number | null;
  cvr: number | null;
  pesanan: number | null;
  pembeli: number | null;
}

export interface SourceRow {
  source: string;
  penjualan: number;
}

/** Rich product fields stashed in product_summary.extra (jsonb) — no migration. */
export interface ProductExtra {
  units?: number | null; // unit produk terjual (Pesanan Dibuat)
  pembeli?: number | null; // total pembeli
  aov?: number | null; // penjualan per pesanan
  cart?: number | null; // dimasukkan ke keranjang
  cart_rate?: number | null; // tingkat konversi keranjang (fraction)
  repeat_rate?: number | null; // tingkat pesanan berulang (fraction)
  pengunjung?: number | null; // pengunjung produk (kunjungan)
  lihat_tanpa_beli?: number | null; // pengunjung melihat tanpa membeli
  suka?: number | null; // suka (likes)
  status_produk?: string | null;
}

export interface ProductSummaryRow {
  kode_produk: string;
  product_name: string;
  penjualan: number;
  dilihat: number | null;
  diklik: number | null;
  total_pesanan: number | null;
  persentase_klik: number | null;
  konversi: number | null;
  total_pembeli: number | null;
  extra: ProductExtra;
}

export interface ProductDetailRow {
  kode_produk: string;
  kode_variasi: string;
  nama_variasi: string;
  sku_induk: string | null;
  penjualan: number;
  dilihat: number | null;
  diklik: number | null;
  konversi: number | null;
  extra: Record<string, string>;
}

/** Rich ad fields stashed in ads_summary.extra (jsonb) — no migration. */
export interface AdsExtra {
  mode_bidding?: string | null; // e.g. "GMV Max ROAS" / "GMV Max Auto"
  kode_produk?: string | null;
  konversi_langsung?: number | null; // direct conversions
  omzet_langsung?: number | null; // direct GMV
  atc_rate?: number | null; // add-to-cart rate (fraction)
}

export interface AdsRow {
  nama_iklan: string;
  status: string | null;
  jenis_iklan: string | null;
  dilihat: number | null;
  klik: number | null;
  ctr: number | null;
  add_to_cart: number | null;
  konversi: number | null;
  cvr: number | null;
  biaya_per_konversi: number | null;
  produk_terjual: number | null;
  omzet: number | null;
  biaya: number | null;
  roas: number | null;
  acos: number | null;
  voucher: number | null;
  extra: AdsExtra;
}

export interface ParsedGlobal {
  period: { start: string; end: string } | null;
  daily: GlobalDailyRow[];
  sources: SourceRow[];
  channels: GlobalChannelRow[];
}
