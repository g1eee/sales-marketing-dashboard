import { createClient } from "@/lib/supabase/server";

export interface DocumentInput {
  brandId: string;
  docType: string;
  title: string;
  url: string;
  month: number;
  year: number;
  notes: string;
}

export interface DocumentRow {
  id: string;
  brandId: string;
  brandName: string;
  docType: string;
  title: string;
  url: string;
  month: number;
  year: number;
  notes: string;
  createdAt: string;
}

export interface DocumentFilters {
  brandId?: string;
  month?: number;
  year?: number;
}

export function validateDocumentInput(input: Partial<DocumentInput>): string | null {
  if (!input.brandId) return "Brand wajib dipilih.";
  if (!input.docType?.trim()) return "Jenis dokumen wajib diisi.";
  if (!input.title?.trim()) return "Judul wajib diisi.";
  if (!input.url?.trim()) return "Link wajib diisi.";
  try {
    new URL(input.url);
  } catch {
    return "Link harus URL yang valid (pakai https://).";
  }
  if (!input.month || input.month < 1 || input.month > 12) return "Bulan tidak valid.";
  if (!input.year || input.year < 2000 || input.year > 2100) return "Tahun tidak valid.";
  return null;
}

export function parseDocumentFilters(
  sp: Record<string, string | undefined>,
): DocumentFilters {
  const f: DocumentFilters = {};
  if (sp.brand) f.brandId = sp.brand;
  const m = Number(sp.month);
  if (Number.isInteger(m) && m >= 1 && m <= 12) f.month = m;
  const y = Number(sp.year);
  if (Number.isInteger(y) && y >= 2000 && y <= 2100) f.year = y;
  return f;
}

type RawDoc = {
  id: string;
  brand_id: string;
  doc_type: string;
  title: string;
  url: string;
  month: number;
  year: number;
  notes: string;
  created_at: string;
  brands: { name: string } | null;
};

export async function getDocuments(filters: DocumentFilters): Promise<DocumentRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("documents")
    .select(
      "id, brand_id, doc_type, title, url, month, year, notes, created_at, brands(name)",
    )
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("created_at", { ascending: false });
  if (filters.brandId) q = q.eq("brand_id", filters.brandId);
  if (filters.month) q = q.eq("month", filters.month);
  if (filters.year) q = q.eq("year", filters.year);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as RawDoc[]).map((d) => ({
    id: d.id,
    brandId: d.brand_id,
    brandName: d.brands?.name ?? "—",
    docType: d.doc_type,
    title: d.title,
    url: d.url,
    month: d.month,
    year: d.year,
    notes: d.notes,
    createdAt: d.created_at,
  }));
}

export async function getDocTypes(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("documents").select("doc_type");
  return [...new Set((data ?? []).map((r) => r.doc_type as string))].sort();
}
