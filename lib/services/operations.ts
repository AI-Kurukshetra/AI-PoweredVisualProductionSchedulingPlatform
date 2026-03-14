import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type Operation = {
  id: string;
  work_order_id: string;
  production_line_id: string | null;
  machine_id: string | null;
  worker_id: string | null;
  name: string;
  sequence: number;
  quantity: string;
  priority: number;
  deadline: string | null;
  status: string;
  dependency_ids: string[];
  planned_start: string | null;
  planned_end: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type OperationWithRefs = Operation & {
  production_lines?: { id: string; name: string } | null;
  machines?: { id: string; name: string } | null;
  workers?: { id: string; name: string } | null;
  work_orders?: { id: string; organization_id: string } | null;
};

export async function listOperations(
  supabase: SupabaseLikeClient,
  input: { workOrderId: string }
) {
  const result = await supabase
    .from("operations")
    .select(
      "id,work_order_id,production_line_id,machine_id,worker_id,name,sequence,quantity,priority,deadline,status,dependency_ids,planned_start,planned_end,created_by,created_at,updated_at,production_lines(id,name),machines(id,name),workers(id,name),work_orders(id,organization_id)"
    )
    .eq("work_order_id", input.workOrderId)
    .order("sequence", { ascending: true });

  return requireData(result) as unknown as OperationWithRefs[];
}

export async function getOperationById(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase
    .from("operations")
    .select(
      "id,work_order_id,production_line_id,machine_id,worker_id,name,sequence,quantity,priority,deadline,status,dependency_ids,planned_start,planned_end,created_by,created_at,updated_at,production_lines(id,name),machines(id,name),workers(id,name),work_orders(id,organization_id)"
    )
    .eq("id", id)
    .single();

  return requireData(result) as unknown as OperationWithRefs;
}

export async function createOperation(
  supabase: SupabaseLikeClient,
  input: {
    workOrderId: string;
    productionLineId?: string | null;
    machineId?: string | null;
    workerId?: string | null;
    name: string;
    sequence: number;
    quantity: number;
    priority: number;
    deadline?: string | null;
    status?: string;
    dependencyIds?: string[];
    plannedStart?: string | null;
    plannedEnd?: string | null;
  }
) {
  const result = await supabase
    .from("operations")
    .insert({
      work_order_id: input.workOrderId,
      production_line_id: input.productionLineId ?? null,
      machine_id: input.machineId ?? null,
      worker_id: input.workerId ?? null,
      name: input.name,
      sequence: input.sequence,
      quantity: input.quantity,
      priority: input.priority,
      deadline: input.deadline ?? null,
      status: input.status ?? "pending",
      dependency_ids: input.dependencyIds ?? [],
      planned_start: input.plannedStart ?? null,
      planned_end: input.plannedEnd ?? null,
    })
    .select(
      "id,work_order_id,production_line_id,machine_id,worker_id,name,sequence,quantity,priority,deadline,status,dependency_ids,planned_start,planned_end,created_by,created_at,updated_at,production_lines(id,name),machines(id,name),workers(id,name),work_orders(id,organization_id)"
    )
    .single();

  return requireData(result) as unknown as OperationWithRefs;
}

export async function updateOperation(
  supabase: SupabaseLikeClient,
  input: {
    id: string;
    productionLineId?: string | null;
    machineId?: string | null;
    workerId?: string | null;
    name?: string;
    sequence?: number;
    quantity?: number;
    priority?: number;
    deadline?: string | null;
    status?: string;
    dependencyIds?: string[];
    plannedStart?: string | null;
    plannedEnd?: string | null;
  }
) {
  const patch: Record<string, unknown> = {};
  if (input.productionLineId !== undefined) patch.production_line_id = input.productionLineId;
  if (input.machineId !== undefined) patch.machine_id = input.machineId;
  if (input.workerId !== undefined) patch.worker_id = input.workerId;
  if (typeof input.name === "string") patch.name = input.name;
  if (typeof input.sequence === "number") patch.sequence = input.sequence;
  if (typeof input.quantity === "number") patch.quantity = input.quantity;
  if (typeof input.priority === "number") patch.priority = input.priority;
  if (input.deadline !== undefined) patch.deadline = input.deadline;
  if (typeof input.status === "string") patch.status = input.status;
  if (input.dependencyIds !== undefined) patch.dependency_ids = input.dependencyIds;
  if (input.plannedStart !== undefined) patch.planned_start = input.plannedStart;
  if (input.plannedEnd !== undefined) patch.planned_end = input.plannedEnd;

  const result = await supabase
    .from("operations")
    .update(patch)
    .eq("id", input.id)
    .select(
      "id,work_order_id,production_line_id,machine_id,worker_id,name,sequence,quantity,priority,deadline,status,dependency_ids,planned_start,planned_end,created_by,created_at,updated_at,production_lines(id,name),machines(id,name),workers(id,name),work_orders(id,organization_id)"
    )
    .single();

  return requireData(result) as unknown as OperationWithRefs;
}

export async function deleteOperation(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("operations").delete().eq("id", id);
  requireData(result);
}
