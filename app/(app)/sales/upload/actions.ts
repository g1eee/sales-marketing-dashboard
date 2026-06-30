"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { classifyAndParse, saveUpload, type UploadPreview } from "@/lib/sales/upload";
import type { ParsedGlobal, AdsRow } from "@/lib/parsers/types";

export async function previewUpload(formData: FormData): Promise<UploadPreview> {
  await requireUser();
  const brandId = String(formData.get("brandId") ?? "");
  if (!brandId) throw new Error("Pilih brand terlebih dahulu.");
  const files = formData.getAll("files") as File[];

  const preview: UploadPreview = {
    brandId,
    period: null,
    sourceFiles: files.map((f) => f.name),
  };
  for (const file of files) {
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const result = isCsv
      ? classifyAndParse({ name: file.name, text: await file.text() })
      : classifyAndParse({ name: file.name, buffer: await file.arrayBuffer() });

    if (result.kind === "global") {
      preview.global = result.payload as ParsedGlobal;
      preview.period ??= (result.payload as ParsedGlobal).period;
    } else if (result.kind === "product") {
      preview.product = result.payload as UploadPreview["product"];
    } else if (result.kind === "ads") {
      preview.ads = result.payload as AdsRow[];
    } else {
      throw new Error(`File "${file.name}" tidak dikenali sebagai export Shopee.`);
    }
  }
  return preview;
}

export async function commitUpload(preview: UploadPreview): Promise<{ periodId: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  return saveUpload(supabase, preview, user.id);
}

export async function deleteUpload(periodId: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  // Cascade (FK on delete cascade) removes all child rows for this period.
  const { error } = await supabase
    .from("report_periods")
    .delete()
    .eq("id", periodId);
  if (error) throw new Error(`Gagal menghapus: ${error.message}`);
  revalidatePath("/sales/upload");
}
