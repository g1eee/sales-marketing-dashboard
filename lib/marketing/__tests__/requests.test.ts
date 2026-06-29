import { describe, it, expect } from "vitest";
import {
  isValidUrl,
  validateRequestInput,
  deadlineState,
  STATUSES,
} from "@/lib/marketing/requests";

describe("isValidUrl", () => {
  it("accepts http(s)", () => {
    expect(isValidUrl("https://drive.google.com/x")).toBe(true);
  });
  it("rejects non-url", () => {
    expect(isValidUrl("not a url")).toBe(false);
    expect(isValidUrl("ftp://x")).toBe(false);
  });
});

describe("validateRequestInput", () => {
  it("accepts a valid request", () => {
    const r = validateRequestInput({
      asset_type: "Banner Toko",
      title: "Promo 6.6",
      brief: "merah",
      deadline: "2026-06-30",
      brand_id: "",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title).toBe("Promo 6.6");
      expect(r.value.brand_id).toBeNull();
      expect(r.value.deadline).toBe("2026-06-30");
    }
  });
  it("rejects missing title", () => {
    const r = validateRequestInput({
      asset_type: "Banner Toko",
      title: "  ",
      brief: "",
      deadline: "",
      brand_id: "",
    });
    expect(r.ok).toBe(false);
  });
  it("rejects unknown asset type", () => {
    const r = validateRequestInput({
      asset_type: "Hologram",
      title: "x",
      brief: "",
      deadline: "",
      brand_id: "",
    });
    expect(r.ok).toBe(false);
  });
});

describe("deadlineState", () => {
  it("none when no deadline", () => {
    expect(deadlineState(null, "2026-06-28")).toBe("none");
  });
  it("overdue when past", () => {
    expect(deadlineState("2026-06-27", "2026-06-28")).toBe("overdue");
  });
  it("soon when within two days", () => {
    expect(deadlineState("2026-06-29", "2026-06-28")).toBe("soon");
  });
  it("ok when far", () => {
    expect(deadlineState("2026-07-15", "2026-06-28")).toBe("ok");
  });
});

describe("STATUSES", () => {
  it("has the five statuses in order", () => {
    expect(STATUSES).toEqual([
      "baru",
      "dikerjakan",
      "review",
      "revisi",
      "selesai",
    ]);
  });
});
