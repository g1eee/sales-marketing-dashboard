import { describe, it, expect } from "vitest";
import { validateDocumentInput, parseDocumentFilters } from "@/lib/documents";

const valid = {
  brandId: "b1",
  docType: "Tracking Harian",
  title: "Sheet Juni",
  url: "https://docs.google.com/x",
  month: 6,
  year: 2026,
  notes: "",
};

describe("validateDocumentInput", () => {
  it("returns null for valid input", () => {
    expect(validateDocumentInput(valid)).toBeNull();
  });
  it("requires brand, jenis, judul, link", () => {
    expect(validateDocumentInput({ ...valid, brandId: "" })).toMatch(/brand/i);
    expect(validateDocumentInput({ ...valid, docType: " " })).toMatch(/jenis/i);
    expect(validateDocumentInput({ ...valid, title: "" })).toMatch(/judul/i);
    expect(validateDocumentInput({ ...valid, url: "" })).toMatch(/link/i);
  });
  it("rejects a non-URL link", () => {
    expect(validateDocumentInput({ ...valid, url: "bukan-url" })).toMatch(/url/i);
  });
  it("rejects month out of range", () => {
    expect(validateDocumentInput({ ...valid, month: 13 })).toMatch(/bulan/i);
  });
});

describe("parseDocumentFilters", () => {
  it("parses brand/month/year and ignores invalid", () => {
    expect(parseDocumentFilters({ brand: "b1", month: "6", year: "2026" })).toEqual({
      brandId: "b1",
      month: 6,
      year: 2026,
    });
    expect(parseDocumentFilters({ month: "13", year: "abc" })).toEqual({});
  });
});
