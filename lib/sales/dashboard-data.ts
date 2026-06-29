import { createClient } from "@/lib/supabase/server";
import { pickStatus, sumDailyTotals } from "@/lib/analytics/aggregate";
import { compareTotals, type TotalsComparison } from "@/lib/analytics/compare";
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

export interface DashboardData {
  period: PeriodRef;
  comparison: TotalsComparison;
  daily: GlobalDailyRow[];
  sources: SourceRow[];
  products: ProductSummaryRow[];
  ads: AdsRow[];
}

export async function getDashboardData(opts: {
  periodId: string;
  comparePeriodId: string | null;
  status: GlobalDailyRow["status"];
}): Promise<DashboardData> {
  const supabase = await createClient();

  const { data: period } = await supabase
    .from("report_periods")
    .select("id, period_start, period_end")
    .eq("id", opts.periodId)
    .single();

  const daily = await fetchDaily(supabase, opts.periodId);
  const currentRows = pickStatus(daily, opts.status);
  const currentTotals = sumDailyTotals(currentRows);

  let previousTotals = null;
  if (opts.comparePeriodId) {
    const prevDaily = await fetchDaily(supabase, opts.comparePeriodId);
    previousTotals = sumDailyTotals(pickStatus(prevDaily, opts.status));
  }

  const [{ data: sources }, { data: products }, { data: ads }] =
    await Promise.all([
      supabase
        .from("global_source")
        .select("source, penjualan")
        .eq("period_id", opts.periodId),
      supabase
        .from("product_summary")
        .select(
          "kode_produk, product_name, penjualan, dilihat, diklik, total_pesanan, persentase_klik, konversi, total_pembeli, extra",
        )
        .eq("period_id", opts.periodId)
        .order("penjualan", { ascending: false }),
      supabase
        .from("ads_summary")
        .select("*")
        .eq("period_id", opts.periodId)
        .order("omzet", { ascending: false, nullsFirst: false }),
    ]);

  return {
    period: period as PeriodRef,
    comparison: compareTotals(currentTotals, previousTotals),
    daily: currentRows,
    sources: (sources ?? []) as SourceRow[],
    products: (products ?? []) as ProductSummaryRow[],
    ads: (ads ?? []) as AdsRow[],
  };
}
