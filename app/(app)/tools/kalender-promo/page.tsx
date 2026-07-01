import { listBrands } from "@/lib/brands";
import { getCampaigns, getMarketplaces, parseCampaignFilters } from "@/lib/promo-campaigns";
import { assignBrandColors } from "@/lib/chart-colors";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CampaignDialog } from "./campaign-dialog";
import { CampaignFilters } from "./campaign-filters";
import { MonthGrid } from "./month-grid";
import { CampaignList } from "./campaign-list";

export default async function KalenderPromoPage({
  searchParams,
}: {
  searchParams: Promise<{
    brand?: string;
    marketplace?: string;
    status?: string;
    view?: string;
    year?: string;
    month?: string;
  }>;
}) {
  const sp = await searchParams;
  const filters = parseCampaignFilters(sp);
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;
  const view = sp.view === "list" ? "list" : "grid";

  const [campaigns, brands, marketplaceOptions] = await Promise.all([
    getCampaigns(filters),
    listBrands(),
    getMarketplaces(),
  ]);
  const brandColors = assignBrandColors(brands);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kalender Promo"
        description="Jadwal promo marketplace & campaign brand."
        actions={
          <CampaignDialog
            brands={brands}
            marketplaceOptions={marketplaceOptions}
            trigger={<Button>+ Tambah Campaign</Button>}
          />
        }
      />

      <CampaignFilters
        brands={brands}
        marketplaceOptions={marketplaceOptions}
        brand={sp.brand ?? "all"}
        marketplace={sp.marketplace ?? "all"}
        status={sp.status ?? "all"}
        view={view}
        year={year}
        month={month}
      />

      {view === "list" ? (
        <CampaignList
          campaigns={campaigns}
          brands={brands}
          marketplaceOptions={marketplaceOptions}
          brandColors={brandColors}
        />
      ) : (
        <MonthGrid
          year={year}
          month={month}
          campaigns={campaigns}
          brands={brands}
          marketplaceOptions={marketplaceOptions}
          brandColors={brandColors}
          filterBrand={sp.brand ?? "all"}
          filterMarketplace={sp.marketplace ?? "all"}
          filterStatus={sp.status ?? "all"}
        />
      )}
    </div>
  );
}
