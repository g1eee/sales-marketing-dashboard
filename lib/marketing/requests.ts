// Pure helpers, constants & types — safe to import from client components.
// Server data access lives in lib/marketing/data.ts (imports Supabase).

export const ASSET_TYPES = [
  "Banner Toko",
  "Flyer Ads",
  "IG Story",
  "IG Feed",
  "Konten Video",
];

export const STATUSES = [
  "baru",
  "dikerjakan",
  "review",
  "revisi",
  "selesai",
] as const;
export type DesignStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<DesignStatus, string> = {
  baru: "Baru",
  dikerjakan: "Dikerjakan",
  review: "Review",
  revisi: "Revisi",
  selesai: "Selesai",
};

export function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export interface RequestInput {
  asset_type: string;
  title: string;
  brief: string;
  deadline: string | null;
  brand_id: string | null;
}

export function validateRequestInput(
  raw: Record<string, string>,
): { ok: true; value: RequestInput } | { ok: false; error: string } {
  const asset_type = (raw.asset_type ?? "").trim();
  const title = (raw.title ?? "").trim();
  if (!ASSET_TYPES.includes(asset_type))
    return { ok: false, error: "Jenis aset tidak valid" };
  if (title.length === 0) return { ok: false, error: "Judul wajib diisi" };
  if (title.length > 120)
    return { ok: false, error: "Judul maksimal 120 karakter" };
  return {
    ok: true,
    value: {
      asset_type,
      title,
      brief: (raw.brief ?? "").trim(),
      deadline: (raw.deadline ?? "").trim() || null,
      brand_id: (raw.brand_id ?? "").trim() || null,
    },
  };
}

export function deadlineState(
  deadline: string | null,
  today: string,
): "none" | "ok" | "soon" | "overdue" {
  if (!deadline) return "none";
  const d = new Date(`${deadline}T00:00:00Z`).getTime();
  const t = new Date(`${today}T00:00:00Z`).getTime();
  const days = (d - t) / 86400000;
  if (days < 0) return "overdue";
  if (days <= 2) return "soon";
  return "ok";
}

export interface DesignRequest {
  id: string;
  asset_type: string;
  title: string;
  brief: string;
  deadline: string | null;
  status: DesignStatus;
  result_link: string | null;
  brand_id: string | null;
  created_at: string;
}
