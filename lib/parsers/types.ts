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
}

export interface SourceRow {
  source: string;
  penjualan: number;
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
  extra: Record<string, string>;
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
  extra: Record<string, string>;
}

export interface ParsedGlobal {
  period: { start: string; end: string } | null;
  daily: GlobalDailyRow[];
  sources: SourceRow[];
}
