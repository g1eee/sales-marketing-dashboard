import { createClient } from "@/lib/supabase/server";
import { pickStatus, sumDailyTotals } from "@/lib/analytics/aggregate";
import { compareTotals, type TotalsComparison } from "@/lib/analytics/compare";
import { aggregateProducts, type ProductAgg } from "@/lib/analytics/product";
import { aggregateAds, type AdsAgg } from "@/lib/analytics/ads";
import type {
  GlobalDailyRow,
  SourceRow,
  ProductSummaryRow,
  AdsRow,
} from "@/lib/parsers/types";

type DB = Awaited<ReturnType<typeof createClient>>;

export interface PeriodRef {
  id: string;
  period_start: string;
  period_end: string;
}

export async function getPeriods(brandId: string): Promise<PeriodRef[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("report_periods")
    .select("id, period_start, period_end")
    .eq("brand_id", brandId)
    .eq("platform", "shopee")
    .order("period_start", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function getPeriod(supabase: DB, periodId: string): Promise<PeriodRef> {
  const { data } = await supabase
    .from("report_periods")
    .select("id, period_start, period_end")
    .eq("id", periodId)
    .single();
  return data as PeriodRef;
}

async function fetchDaily(
  supabase: DB,
  periodId: string,
): Promise<GlobalDailyRow[]> {
  const { data } = await supabase
    .from("global_daily")
    .select(
      "date, status, total_penjualan, total_pesanan, penjualan_per_pesanan, produk_diklik, total_pengunjung, konversi, pesanan_dibatalkan",
    )
    .eq("period_id", periodId)
    .order("date");
  return (data ?? []) as GlobalDailyRow[];
}

async function fetchProducts(
  supabase: DB,
  periodId: string,
): Promise<ProductSummaryRow[]> {
  const { data } = await supabase
    .from("product_summary")
    .select(
      "kode_produk, product_name, penjualan, dilihat, diklik, total_pesanan, persentase_klik, konversi, total_pembeli, extra",
    )
    .eq("period_id", periodId)
    .order("penjualan", { ascending: false });
  return (data ?? []) as ProductSummaryRow[];
}

async function fetchAds(supabase: DB, periodId: string): Promise<AdsRow[]> {
  const { data } = await supabase
    .from("ads_summary")
    .select("*")
    .eq("period_id", periodId)
    .order("omzet", { ascending: false, nullsFirst: false });
  return (data ?? []) as AdsRow[];
}

// ---------- Ringkasan (Global) ----------
export interface Funnel {
  dibuat: number;
  siap_dikirim: number;
  dibayar: number;
}

export interface RingkasanData {
  period: PeriodRef;
  comparison: TotalsComparison;
  daily: GlobalDailyRow[]; // selected status only (for the trend chart)
  sources: SourceRow[];
  funnel: Funnel;
}

export async function getRingkasanData(opts: {
  periodId: string;
  comparePeriodId: string | null;
  status: GlobalDailyRow["status"];
}): Promise<RingkasanData> {
  const supabase = await createClient();
  const period = await getPeriod(supabase, opts.periodId);
  const daily = await fetchDaily(supabase, opts.periodId);
  const current = sumDailyTotals(pickStatus(daily, opts.status));

  let previous = null;
  if (opts.comparePeriodId) {
    const prev = await fetchDaily(supabase, opts.comparePeriodId);
    previous = sumDailyTotals(pickStatus(prev, opts.status));
  }

  const { data: sources } = await supabase
    .from("global_source")
    .select("source, penjualan")
    .eq("period_id", opts.periodId);

  const funnel: Funnel = {
    dibuat: sumDailyTotals(pickStatus(daily, "dibuat")).omzet,
    siap_dikirim: sumDailyTotals(pickStatus(daily, "siap_dikirim")).omzet,
    dibayar: sumDailyTotals(pickStatus(daily, "dibayar")).omzet,
  };

  return {
    period,
    comparison: compareTotals(current, previous),
    daily: pickStatus(daily, opts.status),
    sources: (sources ?? []) as SourceRow[],
    funnel,
  };
}

// ---------- Produk ----------
export interface ProdukData {
  period: PeriodRef;
  products: ProductSummaryRow[];
  current: ProductAgg;
  previous: ProductAgg | null;
}

export async function getProdukData(opts: {
  periodId: string;
  comparePeriodId: string | null;
}): Promise<ProdukData> {
  const supabase = await createClient();
  const period = await getPeriod(supabase, opts.periodId);
  const products = await fetchProducts(supabase, opts.periodId);
  let previous: ProductAgg | null = null;
  if (opts.comparePeriodId) {
    previous = aggregateProducts(
      await fetchProducts(supabase, opts.comparePeriodId),
    );
  }
  return { period, products, current: aggregateProducts(products), previous };
}

// ---------- Iklan ----------
export interface IklanData {
  period: PeriodRef;
  ads: AdsRow[];
  current: AdsAgg;
  previous: AdsAgg | null;
}

export async function getIklanData(opts: {
  periodId: string;
  comparePeriodId: string | null;
}): Promise<IklanData> {
  const supabase = await createClient();
  const period = await getPeriod(supabase, opts.periodId);
  const ads = await fetchAds(supabase, opts.periodId);
  let previous: AdsAgg | null = null;
  if (opts.comparePeriodId) {
    previous = aggregateAds(await fetchAds(supabase, opts.comparePeriodId));
  }
  return { period, ads, current: aggregateAds(ads), previous };
}
