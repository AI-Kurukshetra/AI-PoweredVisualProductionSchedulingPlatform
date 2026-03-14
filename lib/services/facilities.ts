import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type Facility = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

export async function listFacilities(
  supabase: SupabaseLikeClient,
  input?: { organizationId?: string }
) {
  let query = supabase
    .from("facilities")
    .select("id,organization_id,name,description,created_by,created_at")
    .order("created_at", { ascending: false });

  if (input?.organizationId) {
    query = query.eq("organization_id", input.organizationId);
  }

  const result = await query;
  return requireData(result) as Facility[];
}

export async function createFacility(
  supabase: SupabaseLikeClient,
  input: { organizationId: string; name: string; description?: string }
) {
  const result = await supabase
    .from("facilities")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      description: input.description ?? null,
    })
    .select("id,organization_id,name,description,created_by,created_at")
    .single();

  return requireData(result) as Facility;
}

export async function updateFacility(
  supabase: SupabaseLikeClient,
  input: { id: string; name?: string; description?: string | null }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string") patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;

  const result = await supabase
    .from("facilities")
    .update(patch)
    .eq("id", input.id)
    .select("id,organization_id,name,description,created_by,created_at")
    .single();

  return requireData(result) as Facility;
}

export async function deleteFacility(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("facilities").delete().eq("id", id);
  requireData(result);
}

