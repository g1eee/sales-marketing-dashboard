"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { validateCampaignInput, type CampaignInput } from "@/lib/promo-campaigns";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function replaceBrands(supabase: SupabaseClient, campaignId: string, brandIds: string[]) {
  const del = await supabase.from("promo_campaign_brands").delete().eq("campaign_id", campaignId);
  if (del.error) throw new Error(`Gagal menyimpan brand: ${del.error.message}`);
  if (brandIds.length === 0) return;
  const ins = await supabase
    .from("promo_campaign_brands")
    .insert(brandIds.map((brandId) => ({ campaign_id: campaignId, brand_id: brandId })));
  if (ins.error) throw new Error(`Gagal menyimpan brand: ${ins.error.message}`);
}

async function replaceMarketplaces(
  supabase: SupabaseClient,
  campaignId: string,
  marketplaces: string[],
) {
  const del = await supabase
    .from("promo_campaign_marketplaces")
    .delete()
    .eq("campaign_id", campaignId);
  if (del.error) throw new Error(`Gagal menyimpan marketplace: ${del.error.message}`);
  if (marketplaces.length === 0) return;
  const ins = await supabase
    .from("promo_campaign_marketplaces")
    .insert(marketplaces.map((marketplace) => ({ campaign_id: campaignId, marketplace })));
  if (ins.error) throw new Error(`Gagal menyimpan marketplace: ${ins.error.message}`);
}

function row(input: CampaignInput) {
  return {
    name: input.name.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    notes: input.notes.trim(),
  };
}

export async function createCampaign(input: CampaignInput): Promise<void> {
  const user = await requireUser();
  const err = validateCampaignInput(input);
  if (err) throw new Error(err);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promo_campaigns")
    .insert({ ...row(input), created_by: user.id })
    .select("id")
    .single();
  if (error) throw new Error(`Gagal menyimpan: ${error.message}`);
  await replaceBrands(supabase, data.id, input.brandIds);
  await replaceMarketplaces(supabase, data.id, input.marketplaces);
  revalidatePath("/tools/kalender-promo");
}

export async function updateCampaign(id: string, input: CampaignInput): Promise<void> {
  await requireUser();
  const err = validateCampaignInput(input);
  if (err) throw new Error(err);
  const supabase = await createClient();
  const { error } = await supabase.from("promo_campaigns").update(row(input)).eq("id", id);
  if (error) throw new Error(`Gagal mengubah: ${error.message}`);
  await replaceBrands(supabase, id, input.brandIds);
  await replaceMarketplaces(supabase, id, input.marketplaces);
  revalidatePath("/tools/kalender-promo");
}

export async function deleteCampaign(id: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("promo_campaigns").delete().eq("id", id);
  if (error) throw new Error(`Gagal menghapus: ${error.message}`);
  revalidatePath("/tools/kalender-promo");
}
