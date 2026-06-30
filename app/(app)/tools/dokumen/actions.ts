"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validateDocumentInput, type DocumentInput } from "@/lib/documents";

function row(input: DocumentInput) {
  return {
    brand_id: input.brandId,
    doc_type: input.docType.trim(),
    title: input.title.trim(),
    url: input.url.trim(),
    month: input.month,
    year: input.year,
    notes: input.notes.trim(),
  };
}

export async function createDocument(input: DocumentInput): Promise<void> {
  const user = await requireUser();
  const err = validateDocumentInput(input);
  if (err) throw new Error(err);
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .insert({ ...row(input), created_by: user.id });
  if (error) throw new Error(`Gagal menyimpan: ${error.message}`);
  revalidatePath("/tools/dokumen");
}

export async function updateDocument(id: string, input: DocumentInput): Promise<void> {
  await requireUser();
  const err = validateDocumentInput(input);
  if (err) throw new Error(err);
  const supabase = await createClient();
  const { error } = await supabase.from("documents").update(row(input)).eq("id", id);
  if (error) throw new Error(`Gagal mengubah: ${error.message}`);
  revalidatePath("/tools/dokumen");
}

export async function deleteDocument(id: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus: ${error.message}`);
  revalidatePath("/tools/dokumen");
}
