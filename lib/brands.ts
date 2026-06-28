import { createClient } from "@/lib/supabase/server";

export function normalizeBrandName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateBrandName(
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = normalizeBrandName(raw);
  if (value.length === 0) return { ok: false, error: "Nama brand wajib diisi" };
  if (value.length > 80) return { ok: false, error: "Nama brand maksimal 80 karakter" };
  return { ok: true, value };
}

export interface Brand {
  id: string;
  name: string;
}

export async function listBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createBrand(rawName: string): Promise<Brand> {
  const v = validateBrandName(rawName);
  if (!v.ok) throw new Error(v.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brands")
    .insert({ name: v.value })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}
