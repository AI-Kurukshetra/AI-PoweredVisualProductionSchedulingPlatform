import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type InventoryStock = {
  id: string;
  facility_id: string;
  material_id: string;
  on_hand: string;
  reserved: string;
  reorder_point: string;
  unit: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type InventoryStockWithMaterial = InventoryStock & {
  materials?: { id: string; name: string; code: string | null; description: string | null } | null;
};

export type MaterialTransaction = {
  id: string;
  facility_id: string;
  material_id: string;
  supplier_id: string | null;
  txn_type: string;
  quantity: string;
  unit: string;
  reference: string | null;
  created_by: string;
  created_at: string;
};

export type MaterialTransactionWithRefs = MaterialTransaction & {
  materials?: { id: string; name: string; code: string | null } | null;
  suppliers?: { id: string; name: string } | null;
};

export async function listInventoryStock(
  supabase: SupabaseLikeClient,
  input: { facilityId: string }
) {
  const result = await supabase
    .from("inventory_stock")
    .select(
      "id,facility_id,material_id,on_hand,reserved,reorder_point,unit,created_by,created_at,updated_at,materials(id,name,code,description)"
    )
    .eq("facility_id", input.facilityId)
    .order("updated_at", { ascending: false });

  return requireData(result) as unknown as InventoryStockWithMaterial[];
}

export async function upsertInventoryStockSettings(
  supabase: SupabaseLikeClient,
  input: {
    facilityId: string;
    materialId: string;
    reserved?: number;
    reorderPoint?: number;
    unit?: string;
  }
) {
  const payload: Record<string, unknown> = {
    facility_id: input.facilityId,
    material_id: input.materialId,
  };
  if (typeof input.reserved === "number") payload.reserved = input.reserved;
  if (typeof input.reorderPoint === "number") payload.reorder_point = input.reorderPoint;
  if (typeof input.unit === "string") payload.unit = input.unit;

  const result = await supabase
    .from("inventory_stock")
    .upsert(payload, { onConflict: "facility_id,material_id" })
    .select(
      "id,facility_id,material_id,on_hand,reserved,reorder_point,unit,created_by,created_at,updated_at,materials(id,name,code,description)"
    )
    .single();

  return requireData(result) as unknown as InventoryStockWithMaterial;
}

export async function listMaterialTransactions(
  supabase: SupabaseLikeClient,
  input: { facilityId: string; materialId?: string; limit?: number }
) {
  let query = supabase
    .from("material_transactions")
    .select(
      "id,facility_id,material_id,supplier_id,txn_type,quantity,unit,reference,created_by,created_at,materials(id,name,code),suppliers(id,name)"
    )
    .eq("facility_id", input.facilityId)
    .order("created_at", { ascending: false });

  if (input.materialId) query = query.eq("material_id", input.materialId);
  if (typeof input.limit === "number") query = query.limit(input.limit);

  const result = await query;
  return requireData(result) as unknown as MaterialTransactionWithRefs[];
}

export async function applyMaterialTransaction(
  supabase: SupabaseLikeClient,
  input: {
    facilityId: string;
    materialId: string;
    supplierId?: string | null;
    txnType: "receipt" | "issue" | "adjustment";
    quantity: number;
    unit: string;
    reference?: string;
  }
) {
  const result = await supabase.rpc("apply_material_transaction", {
    p_facility_id: input.facilityId,
    p_material_id: input.materialId,
    p_supplier_id: input.supplierId ?? null,
    p_txn_type: input.txnType,
    p_quantity: input.quantity,
    p_unit: input.unit,
    p_reference: input.reference ?? null,
  });

  return requireData(result) as unknown as MaterialTransaction;
}

export async function getInventoryStockForMaterial(
  supabase: SupabaseLikeClient,
  input: { facilityId: string; materialId: string }
) {
  const result = await supabase
    .from("inventory_stock")
    .select("id,facility_id,material_id,on_hand,reserved,reorder_point,unit,created_by,created_at,updated_at")
    .eq("facility_id", input.facilityId)
    .eq("material_id", input.materialId)
    .maybeSingle();

  if (result.error) {
    throw new Error(
      [result.error.message, result.error.code ? `code=${result.error.code}` : ""]
        .filter(Boolean)
        .join(" • ")
    );
  }

  return result.data as InventoryStock | null;
}
