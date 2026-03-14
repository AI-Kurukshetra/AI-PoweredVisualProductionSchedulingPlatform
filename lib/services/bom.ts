import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type BillOfMaterial = {
  id: string;
  product_id: string;
  material_id: string;
  quantity: string;
  unit: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type BillOfMaterialWithRefs = BillOfMaterial & {
  products?: { id: string; name: string; sku: string | null } | null;
  materials?: { id: string; name: string; code: string | null } | null;
};

export async function listBom(
  supabase: SupabaseLikeClient,
  input?: { productId?: string }
) {
  let query = supabase
    .from("bill_of_materials")
    .select(
      "id,product_id,material_id,quantity,unit,created_by,created_at,updated_at,products(id,name,sku),materials(id,name,code)"
    )
    .order("created_at", { ascending: false });

  if (input?.productId) {
    query = query.eq("product_id", input.productId);
  }

  const result = await query;
  return requireData(result) as unknown as BillOfMaterialWithRefs[];
}

export async function createBomItem(
  supabase: SupabaseLikeClient,
  input: { productId: string; materialId: string; quantity: number; unit: string }
) {
  const result = await supabase
    .from("bill_of_materials")
    .insert({
      product_id: input.productId,
      material_id: input.materialId,
      quantity: input.quantity,
      unit: input.unit,
    })
    .select(
      "id,product_id,material_id,quantity,unit,created_by,created_at,updated_at,products(id,name,sku),materials(id,name,code)"
    )
    .single();

  return requireData(result) as unknown as BillOfMaterialWithRefs;
}

export async function updateBomItem(
  supabase: SupabaseLikeClient,
  input: { id: string; quantity?: number; unit?: string }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.quantity === "number") patch.quantity = input.quantity;
  if (typeof input.unit === "string") patch.unit = input.unit;

  const result = await supabase
    .from("bill_of_materials")
    .update(patch)
    .eq("id", input.id)
    .select(
      "id,product_id,material_id,quantity,unit,created_by,created_at,updated_at,products(id,name,sku),materials(id,name,code)"
    )
    .single();

  return requireData(result) as unknown as BillOfMaterialWithRefs;
}

export async function deleteBomItem(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("bill_of_materials").delete().eq("id", id);
  requireData(result);
}

