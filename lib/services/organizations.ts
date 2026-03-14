import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type Organization = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

export async function listOrganizations(supabase: SupabaseLikeClient) {
  const result = await supabase
    .from("organizations")
    .select("id,name,description,created_by,created_at")
    .order("created_at", { ascending: false });

  return requireData(result) as Organization[];
}

export async function createOrganization(
  supabase: SupabaseLikeClient,
  input: { name: string; description?: string }
) {
  const result = await supabase
    .from("organizations")
    .insert({ name: input.name, description: input.description ?? null })
    .select("id,name,description,created_by,created_at")
    .single();

  return requireData(result) as Organization;
}

export async function updateOrganization(
  supabase: SupabaseLikeClient,
  input: { id: string; name?: string; description?: string | null }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string") patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;

  const result = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", input.id)
    .select("id,name,description,created_by,created_at")
    .single();

  return requireData(result) as Organization;
}

export async function deleteOrganization(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("organizations").delete().eq("id", id);
  requireData(result);
}

