import Link from "next/link";
import { listBrands } from "@/lib/brands";
import { getPeriods, getDashboardData } from "@/lib/sales/dashboard-data";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { formatPeriodRange } from "@/lib/dates";
import type { GlobalDailyRow } from "@/lib/parsers/types";
import { Controls } from "./controls";
import { Hero } from "./hero";
import { KpiCards } from "./kpi-cards";
import { SourceChart } from "./source-chart";
import { ProductTable } from "./product-table";
import { AdsPanel } from "./ads-panel";

const STATUS_LABELS: Record<GlobalDailyRow["status"], string> = {
  dibuat: "Pesanan Dibuat",
  siap_dikirim: "Siap Dikirim",
  dibayar: "Dibayar",
};

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
      <p className="max-w-sm text-balance text-sm text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    brand?: string;
    period?: string;
    compare?: string;
    status?: string;
  }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "dibuat") as GlobalDailyRow["status"];
  const brands = await listBrands();
  const periods = sp.brand ? await getPeriods(sp.brand) : [];
  const data = sp.period
    ? await getDashboardData({
        periodId: sp.period,
        comparePeriodId: sp.compare ?? null,
        status,
      })
    : null;

  const comparePeriod =
    data && sp.compare
      ? (periods.find((p) => p.id === sp.compare) ?? null)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Sales"
        description="Analitik penjualan Shopee per periode, dengan perbandingan."
        actions={
          <Controls
            brands={brands}
            periods={periods}
            brandId={sp.brand}
            periodId={sp.period}
            compareId={sp.compare}
            status={status}
          />
        }
      />

      {brands.length === 0 ? (
        <EmptyState>
          Belum ada brand.{" "}
          <Link
            href="/brands"
            className="text-primary underline-offset-4 hover:underline"
          >
            Tambah brand
          </Link>{" "}
          dulu, lalu upload data Shopee.
        </EmptyState>
      ) : !data ? (
        sp.brand && periods.length === 0 ? (
          <EmptyState>
            Belum ada data untuk brand ini.{" "}
            <Link
              href="/sales/upload"
              className="text-primary underline-offset-4 hover:underline"
            >
              Upload data Shopee
            </Link>{" "}
            dulu.
          </EmptyState>
        ) : (
          <EmptyState>
            Pilih brand dan periode di atas untuk melihat dashboard.
          </EmptyState>
        )
      ) : (
        <div className="space-y-6">
          <Hero
            comparison={data.comparison}
            daily={data.daily}
            periodLabel={formatPeriodRange(
              data.period.period_start,
              data.period.period_end,
            )}
            statusLabel={STATUS_LABELS[status]}
            compareLabel={
              comparePeriod
                ? formatPeriodRange(
                    comparePeriod.period_start,
                    comparePeriod.period_end,
                  )
                : null
            }
          />
          <KpiCards comparison={data.comparison} />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 shadow-soft">
              <h2 className="mb-4 font-heading text-base font-medium">
                Sumber Penjualan
              </h2>
              <SourceChart sources={data.sources} />
            </Card>
            <div className="lg:col-span-2">
              <ProductTable products={data.products} />
            </div>
          </div>
          <AdsPanel ads={data.ads} />
        </div>
      )}
    </div>
  );
}
