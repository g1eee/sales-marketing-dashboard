import { describe, it, expect } from "vitest";
import { NAV_ITEMS, SECTIONS } from "@/lib/nav";

describe("nav structure", () => {
  it("exposes Digital Marketing and Creative sections", () => {
    expect(SECTIONS.map((s) => s.label)).toEqual([
      "Digital Marketing",
      "Creative",
    ]);
  });

  it("nests the Tools cluster under Digital Marketing", () => {
    const dm = SECTIONS.find((s) => s.label === "Digital Marketing")!;
    const tools = dm.subGroups?.find((g) => g.label === "Tools");
    expect(tools?.items.map((i) => i.href)).toEqual([
      "/tools/dokumen",
      "/tools/kalender-promo",
      "/tools/excel-csv",
    ]);
  });

  it("flattens every route (incl. nested Tools) into NAV_ITEMS for the topbar", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    for (const href of [
      "/",
      "/sales/dashboard",
      "/brands",
      "/sales/upload",
      "/tools/dokumen",
      "/tools/kalender-promo",
      "/tools/excel-csv",
      "/marketing/requests",
      "/creative/library",
      "/creative/approval",
      "/settings",
    ]) {
      expect(hrefs).toContain(href);
    }
  });
});
