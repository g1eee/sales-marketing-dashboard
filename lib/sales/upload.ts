import * as XLSX from "xlsx";
import { detectFileKind } from "@/lib/parsers/detect";
import { parseGlobalWorkbook } from "@/lib/parsers/global";
import { parseProductRows } from "@/lib/parsers/product";
import { parseAdsCsv } from "@/lib/parsers/ads";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FileKind,
  ParsedGlobal,
  AdsRow,
  ProductSummaryRow,
  ProductDetailRow,
} from "@/lib/parsers/types";

export function readWorkbookSheets(buf: ArrayBuffer): { name: string; rows: string[][] }[] {
  // SheetJS mis-parses a bare ArrayBuffer with type:"array" (treats it as raw
  // text), so wrap it in a Uint8Array byte view first.
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  return wb.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], {
      header: 1,
      raw: false,
      defval: "",
    }),
  }));
}

export interface UploadPreview {
  brandId: string;
  period: { start: string; end: string } | null;
  global?: ParsedGlobal;
  product?: { summary: ProductSummaryRow[]; detail: ProductDetailRow[] };
  ads?: AdsRow[];
}

export function classifyAndParse(file: {
  name: string;
  buffer?: ArrayBuffer;
  text?: string;
}): { kind: FileKind | null; payload: unknown } {
  if (file.text !== undefined) {
    const kind = detectFileKind(file.text.slice(0, 2000));
    if (kind === "ads") return { kind, payload: parseAdsCsv(file.text) };
    return { kind, payload: null };
  }
  const sheets = readWorkbookSheets(file.buffer!);
  const headerText = sheets
    .flatMap((s) => s.rows.slice(0, 4).flat())
    .join(" ");
  const kind = detectFileKind(headerText);
  if (kind === "global") return { kind, payload: parseGlobalWorkbook(sheets) };
  if (kind === "product") return { kind, payload: parseProductRows(sheets[0]?.rows ?? []) };
  return { kind, payload: null };
}

export async function saveUpload(
  supabase: SupabaseClient,
  preview: UploadPreview,
  uploadedBy: string,
): Promise<{ periodId: string }> {
  if (!preview.period) throw new Error("Periode tidak terbaca dari file.");
  const { brandId, period } = preview;

  // Replace: delete existing period (cascade removes child rows), then re-create.
  await supabase
    .from("report_periods")
    .delete()
    .match({ brand_id: brandId, platform: "shopee", period_start: period.start, period_end: period.end });

  const { data: rp, error: rpErr } = await supabase
    .from("report_periods")
    .insert({
      brand_id: brandId,
      platform: "shopee",
      period_start: period.start,
      period_end: period.end,
      uploaded_by: uploadedBy,
    })
    .select("id")
    .single();
  if (rpErr) throw rpErr;
  const periodId = rp.id as string;

  if (preview.global) {
    if (preview.global.daily.length)
      await supabase.from("global_daily").insert(
        preview.global.daily.map((d) => ({
          period_id: periodId,
          ...d,
          // penjualan_per_pesanan is an average and can be fractional; the
          // column is bigint rupiah, so round to a whole number.
          penjualan_per_pesanan: roundOrNull(d.penjualan_per_pesanan) ?? 0,
        })),
      );
    if (preview.global.sources.length)
      await supabase.from("global_source").insert(
        preview.global.sources.map((s) => ({ period_id: periodId, ...s })),
      );
  }
  if (preview.product) {
    if (preview.product.summary.length)
      await supabase.from("product_summary").insert(
        preview.product.summary.map((p) => ({ period_id: periodId, ...p })),
      );
    if (preview.product.detail.length)
      await supabase.from("product_detail").insert(
        preview.product.detail.map((p) => ({ period_id: periodId, ...p })),
      );
  }
  if (preview.ads?.length)
    await supabase.from("ads_summary").insert(
      preview.ads.map((a) => ({
        period_id: periodId,
        ...a,
        // biaya_per_konversi is an average; the column is bigint rupiah.
        biaya_per_konversi: roundOrNull(a.biaya_per_konversi),
      })),
    );

  return { periodId };
}

function roundOrNull(n: number | null): number | null {
  return n === null ? null : Math.round(n);
}
