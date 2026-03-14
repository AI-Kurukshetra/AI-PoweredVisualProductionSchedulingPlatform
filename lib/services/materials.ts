import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type Material = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  code: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export async function listMaterials(
  supabase: SupabaseLikeClient,
  input?: { organizationId?: string }
) {
  let query = supabase
    .from("materials")
    .select("id,organization_id,name,description,code,created_by,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (input?.organizationId) {
    query = query.eq("organization_id", input.organizationId);
  }

  const result = await query;
  return requireData(result) as Material[];
}

export async function createMaterial(
  supabase: SupabaseLikeClient,
  input: { organizationId: string; name: string; description?: string; code?: string }
) {
  const result = await supabase
    .from("materials")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      description: input.description ? input.description : null,
      code: input.code ? input.code : null,
    })
    .select("id,organization_id,name,description,code,created_by,created_at,updated_at")
    .single();

  return requireData(result) as Material;
}

export async function updateMaterial(
  supabase: SupabaseLikeClient,
  input: { id: string; name?: string; description?: string | null; code?: string | null }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string") patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.code !== undefined) patch.code = input.code;

  const result = await supabase
    .from("materials")
    .update(patch)
    .eq("id", input.id)
    .select("id,organization_id,name,description,code,created_by,created_at,updated_at")
    .single();

  return requireData(result) as Material;
}

export async function deleteMaterial(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("materials").delete().eq("id", id);
  requireData(result);
}

