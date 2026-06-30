import { describe, it, expect } from "vitest";
import { areaForPath, primaryHref, NAV_ITEMS } from "@/lib/nav";

describe("areaForPath", () => {
  it("maps Digital Marketing routes to dm", () => {
    expect(areaForPath("/sales/dashboard")).toBe("dm");
    expect(areaForPath("/sales/upload")).toBe("dm");
    expect(areaForPath("/tools/dokumen")).toBe("dm");
  });
  it("maps Creative routes to creative", () => {
    expect(areaForPath("/marketing/requests")).toBe("creative");
    expect(areaForPath("/creative/library")).toBe("creative");
  });
  it("resolves the shared /brands route to dm (first area that lists it)", () => {
    expect(areaForPath("/brands")).toBe("dm");
  });
  it("defaults global/unknown routes to dm", () => {
    expect(areaForPath("/")).toBe("dm");
    expect(areaForPath("/settings")).toBe("dm");
  });
});

describe("primaryHref", () => {
  it("returns each area's first route", () => {
    expect(primaryHref("dm")).toBe("/sales/dashboard");
    expect(primaryHref("creative")).toBe("/marketing/requests");
  });
});

describe("NAV_ITEMS", () => {
  it("includes the global Overview and Settings entries", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/settings");
  });
});
