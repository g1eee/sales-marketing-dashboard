"use server";

import { revalidatePath } from "next/cache";
import { createBrand } from "@/lib/brands";

export async function addBrand(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  await createBrand(name);
  revalidatePath("/brands");
}
