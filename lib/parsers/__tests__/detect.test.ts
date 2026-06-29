import { describe, it, expect } from "vitest";
import { detectFileKind } from "@/lib/parsers/detect";

describe("detectFileKind", () => {
  it("detects ads csv", () => {
    expect(
      detectFileKind("Semua Laporan Iklan CPC Urutan Nama Iklan Mode Bidding"),
    ).toBe("ads");
  });
  it("detects product detail", () => {
    expect(detectFileKind("Kode Produk Kode Variasi SKU Induk Nama Variasi")).toBe(
      "product",
    );
  });
  it("detects global", () => {
    expect(
      detectFileKind("Tanggal Total Penjualan (IDR) Total Pesanan Total Pengunjung"),
    ).toBe("global");
  });
  it("returns null for unknown", () => {
    expect(detectFileKind("hello world")).toBeNull();
  });
});
