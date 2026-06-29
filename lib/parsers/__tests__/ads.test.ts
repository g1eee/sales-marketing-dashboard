import { describe, it, expect } from "vitest";
import { parseAdsCsv } from "@/lib/parsers/ads";

const csv = [
  "Semua Laporan Iklan CPC - Shopee Indonesia",
  "Username,kalovaofficial",
  "Periode,01/06/2026 - 27/06/2026",
  "",
  "Urutan,Nama Iklan,Status,Jenis Iklan,Kode Produk,Tampilan Iklan,Mode Bidding,Penempatan Iklan,Tanggal Mulai,Tanggal Selesai,Dilihat,Jumlah Klik,Persentase Klik,Add to Cart,Add to Cart Rate,Konversi,Konversi Langsung,Tingkat konversi,Tingkat Konversi Langsung,Biaya per Konversi,Biaya per Konversi Langsung,Produk Terjual,Terjual Langsung,Omzet Penjualan,Penjualan Langsung (GMV Langsung),Biaya,Efektifitas Iklan,Efektivitas Langsung,ACOS,ACOS Langsung,Jumlah Produk Dilihat,Jumlah Klik Produk,Persentase Klik Produk,Voucher Amount,Vouchered Sales",
  "1,Grup Iklan A,Berjalan,Iklan Produk,-,-,GMV Max ROAS,-,29/04/2026 00:00:00,Tidak Terbatas,134079,5799,4.33%,-,-,313,183,5.40%,3.16%,2373.96,4060.39,422,246,12312632,7267461,743051,16.57,9.78,6.03%,10.22%,-,-,-,114534,747340",
].join("\n");

describe("parseAdsCsv", () => {
  const rows = parseAdsCsv(csv);
  it("parses one ad row, skipping metadata", () => {
    expect(rows).toHaveLength(1);
  });
  it("parses fields with raw number format", () => {
    expect(rows[0]).toMatchObject({
      nama_iklan: "Grup Iklan A",
      status: "Berjalan",
      dilihat: 134079,
      klik: 5799,
      omzet: 12312632,
      biaya: 743051,
      roas: 16.57,
    });
    expect(rows[0].ctr).toBeCloseTo(0.0433, 4);
    expect(rows[0].acos).toBeCloseTo(0.0603, 4);
  });
});
