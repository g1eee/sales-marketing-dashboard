import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthGrid } from "../month-grid";
import { CampaignList } from "../campaign-list";
import type { CampaignRow } from "@/lib/promo-campaigns";
import type { Brand } from "@/lib/brands";

const brands: Brand[] = [{ id: "b1", name: "Brand A" }];
const campaign: CampaignRow = {
  id: "c1",
  name: "11.11 Big Sale",
  startDate: "2026-07-11",
  endDate: "2026-07-12",
  notes: "",
  brands,
  marketplaces: ["Shopee"],
  status: "planned",
  createdAt: "2026-07-01T00:00:00.000Z",
};
const brandColors = new Map([["b1", "#5b9df0"]]);

describe("MonthGrid", () => {
  it("renders the active month label and weekday headers", () => {
    render(
      <MonthGrid
        year={2026}
        month={7}
        campaigns={[campaign]}
        brands={brands}
        marketplaceOptions={["Shopee"]}
        brandColors={brandColors}
        filterBrand="all"
        filterMarketplace="all"
        filterStatus="all"
      />,
    );
    expect(screen.getByText("Juli 2026")).toBeTruthy();
    expect(screen.getByText("Min")).toBeTruthy();
  });

  it("renders a bar for a campaign that falls in the visible month", () => {
    render(
      <MonthGrid
        year={2026}
        month={7}
        campaigns={[campaign]}
        brands={brands}
        marketplaceOptions={["Shopee"]}
        brandColors={brandColors}
        filterBrand="all"
        filterMarketplace="all"
        filterStatus="all"
      />,
    );
    expect(screen.getByText("11.11 Big Sale")).toBeTruthy();
  });
});

describe("CampaignList", () => {
  it("shows the empty state when there are no campaigns", () => {
    render(
      <CampaignList campaigns={[]} brands={brands} marketplaceOptions={["Shopee"]} brandColors={brandColors} />,
    );
    expect(screen.getByText("Belum ada campaign")).toBeTruthy();
  });

  it("lists a campaign with its brand chip and status", () => {
    render(
      <CampaignList
        campaigns={[campaign]}
        brands={brands}
        marketplaceOptions={["Shopee"]}
        brandColors={brandColors}
      />,
    );
    expect(screen.getByText("11.11 Big Sale")).toBeTruthy();
    expect(screen.getByText("Brand A")).toBeTruthy();
    expect(screen.getByText("Planned")).toBeTruthy();
  });
});
