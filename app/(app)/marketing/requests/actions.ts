"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  validateRequestInput,
  isValidUrl,
  STATUSES,
  type DesignStatus,
} from "@/lib/marketing/requests";

export async function createRequest(formData: FormData) {
  const user = await requireUser();
  const raw = {
    asset_type: String(formData.get("asset_type") ?? ""),
    title: String(formData.get("title") ?? ""),
    brief: String(formData.get("brief") ?? ""),
    deadline: String(formData.get("deadline") ?? ""),
    brand_id: String(formData.get("brand_id") ?? ""),
  };
  const v = validateRequestInput(raw);
  if (!v.ok) throw new Error(v.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("design_requests")
    .insert({ ...v.value, requested_by: user.id });
  if (error) throw error;
  revalidatePath("/marketing/requests");
  redirect("/marketing/requests");
}

export async function updateStatus(id: string, status: DesignStatus) {
  await requireUser();
  if (!STATUSES.includes(status)) throw new Error("Status tidak valid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("design_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/marketing/requests");
  revalidatePath(`/marketing/requests/${id}`);
}

export async function setResultLink(id: string, link: string) {
  await requireUser();
  const trimmed = link.trim();
  if (trimmed && !isValidUrl(trimmed))
    throw new Error("Link harus berupa URL http(s) yang valid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("design_requests")
    .update({ result_link: trimmed || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath(`/marketing/requests/${id}`);
}
