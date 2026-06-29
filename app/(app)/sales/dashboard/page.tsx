import Link from "next/link";
import { listBrands } from "@/lib/brands";
import {
  getPeriods,
  getRingkasanData,
  getProdukData,
  getIklanData,
} from "@/lib/sales/dashboard-data";
import { PageHeader } from "@/components/page-header";
import { formatPeriodRange } from "@/lib/dates";
import type { GlobalDailyRow } from "@/lib/parsers/types";
import { Controls } from "./controls";
import { TabNav, type TabKey } from "./tab-nav";
import { RingkasanTab } from "./ringkasan-tab";
import { ProdukTab } from "./produk-tab";
import { IklanTab } from "./iklan-tab";

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
    tab?: string;
  }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "dibuat") as GlobalDailyRow["status"];
  const tab: TabKey = (
    sp.tab === "produk" || sp.tab === "iklan" ? sp.tab : "ringkasan"
  ) as TabKey;
  const compareId = sp.compare ?? null;

  const brands = await listBrands();
  const periods = sp.brand ? await getPeriods(sp.brand) : [];
  const comparePeriod =
    sp.period && compareId
      ? (periods.find((p) => p.id === compareId) ?? null)
      : null;
  const compareLabel = comparePeriod
    ? formatPeriodRange(comparePeriod.period_start, comparePeriod.period_end)
    : null;

  let content: React.ReactNode = null;
  let periodLabel = "";
  if (sp.period) {
    if (tab === "produk") {
      const data = await getProdukData({
        periodId: sp.period,
        comparePeriodId: compareId,
      });
      periodLabel = formatPeriodRange(
        data.period.period_start,
        data.period.period_end,
      );
      content = <ProdukTab data={data} />;
    } else if (tab === "iklan") {
      const data = await getIklanData({
        periodId: sp.period,
        comparePeriodId: compareId,
      });
      periodLabel = formatPeriodRange(
        data.period.period_start,
        data.period.period_end,
      );
      content = <IklanTab data={data} />;
    } else {
      const data = await getRingkasanData({
        periodId: sp.period,
        comparePeriodId: compareId,
        status,
      });
      periodLabel = formatPeriodRange(
        data.period.period_start,
        data.period.period_end,
      );
      content = (
        <RingkasanTab
          data={data}
          periodLabel={periodLabel}
          statusLabel={STATUS_LABELS[status]}
          compareLabel={compareLabel}
        />
      );
    }
  }

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
      ) : !sp.period ? (
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabNav
              params={{
                brand: sp.brand,
                period: sp.period,
                compare: sp.compare,
                status: sp.status,
              }}
              active={tab}
            />
            {tab !== "ringkasan" && periodLabel && (
              <p className="text-sm text-muted-foreground">
                {periodLabel}
                {compareLabel ? ` · vs ${compareLabel}` : ""}
              </p>
            )}
          </div>
          {content}
        </div>
      )}
    </div>
  );
}
