import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "sales" | "marketing";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
}

export function mapProfileToSessionUser(
  authUser: { id: string; email?: string | null },
  profile: { full_name?: string | null; role?: Role | null } | null,
): SessionUser {
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    role: profile?.role ?? "sales",
    fullName: profile?.full_name ?? "",
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  return mapProfileToSessionUser(user, profile);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
