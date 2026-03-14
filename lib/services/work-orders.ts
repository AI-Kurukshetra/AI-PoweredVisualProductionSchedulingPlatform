import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type WorkOrder = {
  id: string;
  organization_id: string;
  product_id: string;
  quantity: string;
  priority: number;
  deadline: string | null;
  status: string;
  dependency_ids: string[];
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type WorkOrderWithProduct = WorkOrder & {
  products?: { id: string; name: string; sku: string | null } | null;
};

export async function listWorkOrders(
  supabase: SupabaseLikeClient,
  input: { organizationId: string }
) {
  const result = await supabase
    .from("work_orders")
    .select(
      "id,organization_id,product_id,quantity,priority,deadline,status,dependency_ids,notes,created_by,created_at,updated_at,products(id,name,sku)"
    )
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false });

  return requireData(result) as unknown as WorkOrderWithProduct[];
}

export async function createWorkOrder(
  supabase: SupabaseLikeClient,
  input: {
    organizationId: string;
    productId: string;
    quantity: number;
    priority: number;
    deadline?: string | null;
    status?: string;
    dependencyIds?: string[];
    notes?: string;
  }
) {
  const result = await supabase
    .from("work_orders")
    .insert({
      organization_id: input.organizationId,
      product_id: input.productId,
      quantity: input.quantity,
      priority: input.priority,
      deadline: input.deadline ?? null,
      status: input.status ?? "planned",
      dependency_ids: input.dependencyIds ?? [],
      notes: input.notes ? input.notes : null,
    })
    .select(
      "id,organization_id,product_id,quantity,priority,deadline,status,dependency_ids,notes,created_by,created_at,updated_at,products(id,name,sku)"
    )
    .single();

  return requireData(result) as unknown as WorkOrderWithProduct;
}

export async function updateWorkOrder(
  supabase: SupabaseLikeClient,
  input: {
    id: string;
    productId?: string;
    quantity?: number;
    priority?: number;
    deadline?: string | null;
    status?: string;
    dependencyIds?: string[];
    notes?: string | null;
  }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.productId === "string") patch.product_id = input.productId;
  if (typeof input.quantity === "number") patch.quantity = input.quantity;
  if (typeof input.priority === "number") patch.priority = input.priority;
  if (input.deadline !== undefined) patch.deadline = input.deadline;
  if (typeof input.status === "string") patch.status = input.status;
  if (input.dependencyIds !== undefined) patch.dependency_ids = input.dependencyIds;
  if (input.notes !== undefined) patch.notes = input.notes;

  const result = await supabase
    .from("work_orders")
    .update(patch)
    .eq("id", input.id)
    .select(
      "id,organization_id,product_id,quantity,priority,deadline,status,dependency_ids,notes,created_by,created_at,updated_at,products(id,name,sku)"
    )
    .single();

  return requireData(result) as unknown as WorkOrderWithProduct;
}

export async function deleteWorkOrder(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("work_orders").delete().eq("id", id);
  requireData(result);
}

