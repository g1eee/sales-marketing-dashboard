import { createClient } from "@/lib/supabase/server";
import type { DesignRequest } from "@/lib/marketing/requests";

const COLS =
  "id, asset_type, title, brief, deadline, status, result_link, brand_id, created_at";

export async function listRequests(): Promise<DesignRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("design_requests")
    .select(COLS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DesignRequest[];
}

export async function getRequest(id: string): Promise<DesignRequest | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("design_requests")
    .select(COLS)
    .eq("id", id)
    .single();
  return (data as DesignRequest) ?? null;
}
