import { createClient } from "@/lib/supabase/server";
import type { Brand } from "@/lib/brands";

export type CampaignStatus = "planned" | "berjalan" | "selesai";

export interface CampaignInput {
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
  brandIds: string[];
  marketplaces: string[];
}

export interface CampaignRow {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
  brands: Brand[];
  marketplaces: string[];
  status: CampaignStatus;
  createdAt: string;
}

export interface CampaignFilters {
  brandId?: string;
  marketplace?: string;
  status?: CampaignStatus;
}

const STATUSES: CampaignStatus[] = ["planned", "berjalan", "selesai"];

export function validateCampaignInput(input: Partial<CampaignInput>): string | null {
  if (!input.name?.trim()) return "Nama campaign wajib diisi.";
  if (!input.startDate) return "Tanggal mulai wajib diisi.";
  if (!input.endDate) return "Tanggal selesai wajib diisi.";
  if (input.endDate < input.startDate) return "Tanggal selesai tidak boleh sebelum tanggal mulai.";
  if (!input.brandIds || input.brandIds.length === 0) return "Pilih minimal 1 brand.";
  return null;
}

export function parseCampaignFilters(sp: {
  brand?: string;
  marketplace?: string;
  status?: string;
}): CampaignFilters {
  const f: CampaignFilters = {};
  if (sp.brand) f.brandId = sp.brand;
  if (sp.marketplace) f.marketplace = sp.marketplace;
  if (sp.status && STATUSES.includes(sp.status as CampaignStatus)) {
    f.status = sp.status as CampaignStatus;
  }
  return f;
}

export function deriveCampaignStatus(
  startDate: string,
  endDate: string,
  today: string,
): CampaignStatus {
  if (today < startDate) return "planned";
  if (today > endDate) return "selesai";
  return "berjalan";
}

type RawCampaign = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  notes: string;
  created_at: string;
  promo_campaign_brands: { brands: { id: string; name: string } | null }[];
  promo_campaign_marketplaces: { marketplace: string }[];
};

export async function getCampaigns(filters: CampaignFilters): Promise<CampaignRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_campaigns")
    .select(
      `id, name, start_date, end_date, notes, created_at,
       promo_campaign_brands ( brands ( id, name ) ),
       promo_campaign_marketplaces ( marketplace )`,
    )
    .order("start_date", { ascending: true });
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  let rows: CampaignRow[] = ((data ?? []) as unknown as RawCampaign[]).map((c) => ({
    id: c.id,
    name: c.name,
    startDate: c.start_date,
    endDate: c.end_date,
    notes: c.notes,
    createdAt: c.created_at,
    brands: c.promo_campaign_brands
      .map((j) => j.brands)
      .filter((b): b is { id: string; name: string } => b !== null),
    marketplaces: c.promo_campaign_marketplaces.map((j) => j.marketplace),
    status: deriveCampaignStatus(c.start_date, c.end_date, today),
  }));

  if (filters.brandId) {
    rows = rows.filter((r) => r.brands.some((b) => b.id === filters.brandId));
  }
  if (filters.marketplace) {
    rows = rows.filter((r) => r.marketplaces.includes(filters.marketplace!));
  }
  if (filters.status) {
    rows = rows.filter((r) => r.status === filters.status);
  }
  return rows;
}

export async function getMarketplaces(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("promo_campaign_marketplaces").select("marketplace");
  return [...new Set((data ?? []).map((r) => r.marketplace as string))].sort();
}
