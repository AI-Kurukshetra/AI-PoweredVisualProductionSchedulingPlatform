import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type Scenario = {
  id: string;
  organization_id: string;
  facility_id: string | null;
  name: string;
  description: string | null;
  range_start: string | null;
  range_end: string | null;
  status: "draft" | "archived" | string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ScenarioTask = {
  id: string;
  scenario_id: string;
  base_task_id: string | null;
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
  work_orders?: {
    id: string;
    deadline: string | null;
    status: string;
    products?: { id: string; name: string } | null;
  } | null;
  machines?: { id: string; name: string; capacity: unknown } | null;
  workers?: { id: string; name: string } | null;
  production_lines?: { id: string; name: string; facility_id: string } | null;
  operations?: { id: string; name: string } | null;
};

export async function listScenarios(
  supabase: SupabaseLikeClient,
  input: { organizationId: string; facilityId?: string; limit?: number }
) {
  let query = supabase
    .from("scenarios")
    .select("id,organization_id,facility_id,name,description,range_start,range_end,status,created_by,created_at,updated_at")
    .eq("organization_id", input.organizationId)
    .order("updated_at", { ascending: false });
  if (input.facilityId) query = query.eq("facility_id", input.facilityId);
  if (typeof input.limit === "number") query = query.limit(input.limit);

  const result = await query;
  return requireData(result) as unknown as Scenario[];
}

export async function getScenarioById(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase
    .from("scenarios")
    .select("id,organization_id,facility_id,name,description,range_start,range_end,status,created_by,created_at,updated_at")
    .eq("id", id)
    .single();
  return requireData(result) as unknown as Scenario;
}

export async function createScenario(
  supabase: SupabaseLikeClient,
  input: {
    organizationId: string;
    facilityId?: string | null;
    name: string;
    description?: string;
    rangeStart?: string | null;
    rangeEnd?: string | null;
  }
) {
  const result = await supabase
    .from("scenarios")
    .insert({
      organization_id: input.organizationId,
      facility_id: input.facilityId ?? null,
      name: input.name,
      description: input.description ?? null,
      range_start: input.rangeStart ?? null,
      range_end: input.rangeEnd ?? null,
      status: "draft",
    })
    .select("id,organization_id,facility_id,name,description,range_start,range_end,status,created_by,created_at,updated_at")
    .single();
  return requireData(result) as unknown as Scenario;
}

export async function updateScenario(
  supabase: SupabaseLikeClient,
  input: {
    id: string;
    name?: string;
    description?: string | null;
    status?: "draft" | "archived";
  }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string") patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (typeof input.status === "string") patch.status = input.status;

  const result = await supabase
    .from("scenarios")
    .update(patch)
    .eq("id", input.id)
    .select("id,organization_id,facility_id,name,description,range_start,range_end,status,created_by,created_at,updated_at")
    .single();
  return requireData(result) as unknown as Scenario;
}

export async function deleteScenario(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("scenarios").delete().eq("id", id);
  requireData(result);
}

export async function listScenarioTasks(
  supabase: SupabaseLikeClient,
  input: { scenarioId: string; workOrderId?: string; limit?: number }
) {
  let query = supabase
    .from("scenario_tasks")
    .select(
      "id,scenario_id,base_task_id,work_order_id,operation_id,production_line_id,machine_id,worker_id,start_time,end_time,status,notes,created_by,created_at,updated_at,work_orders(id,deadline,status,products(id,name)),operations(id,name),production_lines(id,name,facility_id),machines(id,name,capacity),workers(id,name)"
    )
    .eq("scenario_id", input.scenarioId)
    .order("start_time", { ascending: true });
  if (input.workOrderId) query = query.eq("work_order_id", input.workOrderId);
  if (typeof input.limit === "number") query = query.limit(input.limit);

  const result = await query;
  return requireData(result) as unknown as ScenarioTask[];
}

export async function updateScenarioTask(
  supabase: SupabaseLikeClient,
  input: {
    id: string;
    machineId?: string | null;
    workerId?: string | null;
    productionLineId?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    notes?: string | null;
    status?: string;
  }
) {
  const patch: Record<string, unknown> = {};
  if (input.machineId !== undefined) patch.machine_id = input.machineId;
  if (input.workerId !== undefined) patch.worker_id = input.workerId;
  if (input.productionLineId !== undefined) patch.production_line_id = input.productionLineId;
  if (input.startTime !== undefined) patch.start_time = input.startTime;
  if (input.endTime !== undefined) patch.end_time = input.endTime;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.status !== undefined) patch.status = input.status;

  const result = await supabase
    .from("scenario_tasks")
    .update(patch)
    .eq("id", input.id)
    .select(
      "id,scenario_id,base_task_id,work_order_id,operation_id,production_line_id,machine_id,worker_id,start_time,end_time,status,notes,created_by,created_at,updated_at"
    )
    .single();
  return requireData(result) as unknown as ScenarioTask;
}

export async function insertScenarioTasks(
  supabase: SupabaseLikeClient,
  input: {
    scenarioId: string;
    tasks: Array<{
      baseTaskId?: string | null;
      workOrderId: string;
      operationId?: string | null;
      productionLineId?: string | null;
      machineId?: string | null;
      workerId?: string | null;
      startTime?: string | null;
      endTime?: string | null;
      status?: string;
      notes?: string | null;
    }>;
  }
) {
  if (!input.tasks.length) return [];
  const payload = input.tasks.map((t) => ({
    scenario_id: input.scenarioId,
    base_task_id: t.baseTaskId ?? null,
    work_order_id: t.workOrderId,
    operation_id: t.operationId ?? null,
    production_line_id: t.productionLineId ?? null,
    machine_id: t.machineId ?? null,
    worker_id: t.workerId ?? null,
    start_time: t.startTime ?? null,
    end_time: t.endTime ?? null,
    status: t.status ?? "scheduled",
    notes: t.notes ?? null,
  }));

  const result = await supabase
    .from("scenario_tasks")
    .upsert(payload, { onConflict: "scenario_id,base_task_id" })
    .select(
      "id,scenario_id,base_task_id,work_order_id,operation_id,production_line_id,machine_id,worker_id,start_time,end_time,status,notes,created_by,created_at,updated_at"
    );
  return requireData(result) as unknown as ScenarioTask[];
}

