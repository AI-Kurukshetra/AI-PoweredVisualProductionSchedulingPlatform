import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type Product = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  default_production_time: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export async function listProducts(
  supabase: SupabaseLikeClient,
  input?: { organizationId?: string }
) {
  let query = supabase
    .from("products")
    .select(
      "id,organization_id,name,description,sku,default_production_time,created_by,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  if (input?.organizationId) {
    query = query.eq("organization_id", input.organizationId);
  }

  const result = await query;
  return requireData(result) as Product[];
}

export async function createProduct(
  supabase: SupabaseLikeClient,
  input: {
    organizationId: string;
    name: string;
    description?: string;
    sku?: string;
    defaultProductionTime?: number;
  }
) {
  const result = await supabase
    .from("products")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      description: input.description ? input.description : null,
      sku: input.sku ? input.sku : null,
      default_production_time: input.defaultProductionTime ?? 0,
    })
    .select(
      "id,organization_id,name,description,sku,default_production_time,created_by,created_at,updated_at"
    )
    .single();

  return requireData(result) as Product;
}

export async function updateProduct(
  supabase: SupabaseLikeClient,
  input: {
    id: string;
    name?: string;
    description?: string | null;
    sku?: string | null;
    defaultProductionTime?: number;
  }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string") patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.sku !== undefined) patch.sku = input.sku;
  if (typeof input.defaultProductionTime === "number")
    patch.default_production_time = input.defaultProductionTime;

  const result = await supabase
    .from("products")
    .update(patch)
    .eq("id", input.id)
    .select(
      "id,organization_id,name,description,sku,default_production_time,created_by,created_at,updated_at"
    )
    .single();

  return requireData(result) as Product;
}

export async function deleteProduct(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("products").delete().eq("id", id);
  requireData(result);
}
