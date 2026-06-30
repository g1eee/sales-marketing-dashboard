import { createClient } from "@/lib/supabase/server";

export interface RawPeriod {
  id: string;
  brand_id: string;
  platform: string;
  period_start: string;
  period_end: string;
  source_files: string[];
  uploaded_by: string | null;
  created_at: string;
}

export interface UploadHistoryRow {
  id: string;
  brandId: string;
  brandName: string;
  platform: string;
  periodStart: string;
  periodEnd: string;
  sourceFiles: string[];
  uploaderName: string;
  createdAt: string;
}

export function toHistoryRows(
  periods: RawPeriod[],
  brandNameById: Record<string, string>,
  uploaderNameById: Record<string, string>,
): UploadHistoryRow[] {
  return periods.map((p) => ({
    id: p.id,
    brandId: p.brand_id,
    brandName: brandNameById[p.brand_id] ?? "—",
    platform: p.platform,
    periodStart: p.period_start,
    periodEnd: p.period_end,
    sourceFiles: p.source_files ?? [],
    uploaderName: (p.uploaded_by && uploaderNameById[p.uploaded_by]) || "—",
    createdAt: p.created_at,
  }));
}

// report_periods.uploaded_by → auth.users and profiles.id → auth.users, so there
// is no direct FK to join on; fetch profiles + brands separately and map by id.
export async function getUploadHistory(): Promise<UploadHistoryRow[]> {
  const supabase = await createClient();
  const { data: periods, error } = await supabase
    .from("report_periods")
    .select(
      "id, brand_id, platform, period_start, period_end, source_files, uploaded_by, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (periods ?? []) as RawPeriod[];

  const [{ data: brands }, { data: profiles }] = await Promise.all([
    supabase.from("brands").select("id, name"),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const brandNameById = Object.fromEntries(
    (brands ?? []).map((b) => [b.id, b.name]),
  );
  const uploaderNameById = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name]),
  );
  return toHistoryRows(rows, brandNameById, uploaderNameById);
}
