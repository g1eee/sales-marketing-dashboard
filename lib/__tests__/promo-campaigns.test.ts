import { describe, it, expect } from "vitest";
import {
  validateCampaignInput,
  parseCampaignFilters,
  deriveCampaignStatus,
} from "@/lib/promo-campaigns";

const valid = {
  name: "Promo 11.11",
  startDate: "2026-11-11",
  endDate: "2026-11-12",
  notes: "",
  brandIds: ["b1"],
  marketplaces: ["Shopee"],
};

describe("validateCampaignInput", () => {
  it("returns null for valid input", () => {
    expect(validateCampaignInput(valid)).toBeNull();
  });
  it("requires nama, tanggal mulai, tanggal selesai, minimal 1 brand", () => {
    expect(validateCampaignInput({ ...valid, name: " " })).toMatch(/nama/i);
    expect(validateCampaignInput({ ...valid, startDate: "" })).toMatch(/mulai/i);
    expect(validateCampaignInput({ ...valid, endDate: "" })).toMatch(/selesai/i);
    expect(validateCampaignInput({ ...valid, brandIds: [] })).toMatch(/brand/i);
  });
  it("rejects endDate before startDate", () => {
    expect(
      validateCampaignInput({ ...valid, startDate: "2026-11-12", endDate: "2026-11-11" }),
    ).toMatch(/tanggal selesai/i);
  });
});

describe("parseCampaignFilters", () => {
  it("parses brand/marketplace/status and ignores an invalid status", () => {
    expect(
      parseCampaignFilters({ brand: "b1", marketplace: "Shopee", status: "berjalan" }),
    ).toEqual({ brandId: "b1", marketplace: "Shopee", status: "berjalan" });
    expect(parseCampaignFilters({ status: "invalid" })).toEqual({});
  });
});

describe("deriveCampaignStatus", () => {
  it("is planned when today is before the start date", () => {
    expect(deriveCampaignStatus("2026-08-01", "2026-08-05", "2026-07-01")).toBe("planned");
  });
  it("is berjalan when today is within range, inclusive of both ends", () => {
    expect(deriveCampaignStatus("2026-07-01", "2026-07-05", "2026-07-01")).toBe("berjalan");
    expect(deriveCampaignStatus("2026-06-28", "2026-07-01", "2026-07-01")).toBe("berjalan");
  });
  it("is selesai when today is after the end date", () => {
    expect(deriveCampaignStatus("2026-06-01", "2026-06-05", "2026-07-01")).toBe("selesai");
  });
});
