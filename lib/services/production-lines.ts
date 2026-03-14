import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type ProductionLine = {
  id: string;
  facility_id: string;
  name: string;
  description: string | null;
  capacity: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ProductionLineWithFacility = ProductionLine & {
  facilities?: { id: string; name: string; organization_id: string } | null;
};

export async function listProductionLines(
  supabase: SupabaseLikeClient,
  input?: { facilityId?: string }
) {
  let query = supabase
    .from("production_lines")
    .select(
      "id,facility_id,name,description,capacity,created_by,created_at,updated_at,facilities(id,name,organization_id)"
    )
    .order("updated_at", { ascending: false });

  if (input?.facilityId) {
    query = query.eq("facility_id", input.facilityId);
  }

  const result = await query;
  return requireData(result) as unknown as ProductionLineWithFacility[];
}

export async function createProductionLine(
  supabase: SupabaseLikeClient,
  input: { facilityId: string; name: string; capacity: number; description?: string }
) {
  const result = await supabase
    .from("production_lines")
    .insert({
      facility_id: input.facilityId,
      name: input.name,
      capacity: input.capacity,
      description: input.description ?? null,
    })
    .select(
      "id,facility_id,name,description,capacity,created_by,created_at,updated_at,facilities(id,name,organization_id)"
    )
    .single();

  return requireData(result) as unknown as ProductionLineWithFacility;
}

export async function updateProductionLine(
  supabase: SupabaseLikeClient,
  input: {
    id: string;
    name?: string;
    description?: string | null;
    capacity?: number;
  }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string") patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (typeof input.capacity === "number") patch.capacity = input.capacity;

  const result = await supabase
    .from("production_lines")
    .update(patch)
    .eq("id", input.id)
    .select(
      "id,facility_id,name,description,capacity,created_by,created_at,updated_at,facilities(id,name,organization_id)"
    )
    .single();

  return requireData(result) as unknown as ProductionLineWithFacility;
}

export async function deleteProductionLine(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("production_lines").delete().eq("id", id);
  requireData(result);
}
