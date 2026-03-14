import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type SchedulingTask = {
  id: string;
  work_order_id: string;
  operation_id: string | null;
  production_line_id: string | null;
  machine_id: string | null;
  worker_id: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SchedulingTaskWithRefs = SchedulingTask & {
  work_orders?: { id: string } | null;
  operations?: { id: string; name: string } | null;
  production_lines?: { id: string; name: string } | null;
  machines?: { id: string; name: string } | null;
  workers?: { id: string; name: string } | null;
};

export async function listSchedulingTasks(
  supabase: SupabaseLikeClient,
  input: { workOrderId: string }
) {
  const result = await supabase
    .from("scheduling_tasks")
    .select(
      "id,work_order_id,operation_id,production_line_id,machine_id,worker_id,start_time,end_time,status,notes,created_by,created_at,updated_at,work_orders(id),operations(id,name),production_lines(id,name),machines(id,name),workers(id,name)"
    )
    .eq("work_order_id", input.workOrderId)
    .order("start_time", { ascending: true });

  return requireData(result) as unknown as SchedulingTaskWithRefs[];
}

export async function getSchedulingTaskById(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase
    .from("scheduling_tasks")
    .select(
      "id,work_order_id,operation_id,production_line_id,machine_id,worker_id,start_time,end_time,status,notes,created_by,created_at,updated_at,work_orders(id),operations(id,name),production_lines(id,name),machines(id,name),workers(id,name)"
    )
    .eq("id", id)
    .single();

  return requireData(result) as unknown as SchedulingTaskWithRefs;
}

export async function createSchedulingTask(
  supabase: SupabaseLikeClient,
  input: {
    workOrderId: string;
    operationId?: string | null;
    productionLineId?: string | null;
    machineId?: string | null;
    workerId?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    status?: string;
    notes?: string;
  }
) {
  const result = await supabase
    .from("scheduling_tasks")
    .insert({
      work_order_id: input.workOrderId,
      operation_id: input.operationId ?? null,
      production_line_id: input.productionLineId ?? null,
      machine_id: input.machineId ?? null,
      worker_id: input.workerId ?? null,
      start_time: input.startTime ?? null,
      end_time: input.endTime ?? null,
      status: input.status ?? "scheduled",
      notes: input.notes ? input.notes : null,
    })
    .select(
      "id,work_order_id,operation_id,production_line_id,machine_id,worker_id,start_time,end_time,status,notes,created_by,created_at,updated_at,work_orders(id),operations(id,name),production_lines(id,name),machines(id,name),workers(id,name)"
    )
    .single();

  return requireData(result) as unknown as SchedulingTaskWithRefs;
}

export async function updateSchedulingTask(
  supabase: SupabaseLikeClient,
  input: {
    id: string;
    operationId?: string | null;
    productionLineId?: string | null;
    machineId?: string | null;
    workerId?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    status?: string;
    notes?: string | null;
  }
) {
  const patch: Record<string, unknown> = {};
  if (input.operationId !== undefined) patch.operation_id = input.operationId;
  if (input.productionLineId !== undefined) patch.production_line_id = input.productionLineId;
  if (input.machineId !== undefined) patch.machine_id = input.machineId;
  if (input.workerId !== undefined) patch.worker_id = input.workerId;
  if (input.startTime !== undefined) patch.start_time = input.startTime;
  if (input.endTime !== undefined) patch.end_time = input.endTime;
  if (typeof input.status === "string") patch.status = input.status;
  if (input.notes !== undefined) patch.notes = input.notes;

  const result = await supabase
    .from("scheduling_tasks")
    .update(patch)
    .eq("id", input.id)
    .select(
      "id,work_order_id,operation_id,production_line_id,machine_id,worker_id,start_time,end_time,status,notes,created_by,created_at,updated_at,work_orders(id),operations(id,name),production_lines(id,name),machines(id,name),workers(id,name)"
    )
    .single();

  return requireData(result) as unknown as SchedulingTaskWithRefs;
}

export async function deleteSchedulingTask(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("scheduling_tasks").delete().eq("id", id);
  requireData(result);
}
