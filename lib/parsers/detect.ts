import type { FileKind } from "@/lib/parsers/types";

export function detectFileKind(allHeaderText: string): FileKind | null {
  const t = (allHeaderText ?? "").toLowerCase();
  if (t.includes("laporan iklan") || (t.includes("nama iklan") && t.includes("mode bidding")))
    return "ads";
  if (t.includes("kode variasi") && t.includes("sku induk")) return "product";
  if (t.includes("total penjualan") && t.includes("total pengunjung")) return "global";
  return null;
}
