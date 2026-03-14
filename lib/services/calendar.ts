
import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type Shift = {
  id: string;
  organization_id: string;
  name: string;
  days_of_week: string[];
  start_time: string;
  end_time: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Holiday = {
  id: string;
  organization_id: string;
  name: string;
  date: string;
  notes: string | null;
  created_by: string;
  created_at: string;
};

export type MaintenanceWindow = {
  id: string;
  machine_id: string;
  start_time: string;
  end_time: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  machines?: { id: string; name: string } | null;
};

export type MachineShiftAssignment = {
  id: string;
  machine_id: string;
  shift_id: string;
  created_by: string;
  created_at: string;
  shifts?: Shift | null;
};

export type WorkerShiftAssignment = {
  id: string;
  worker_id: string;
  shift_id: string;
  created_by: string;
  created_at: string;
  shifts?: Shift | null;
};

export async function listShifts(
  supabase: SupabaseLikeClient,
  input: { organizationId: string }
) {
  const result = await supabase
    .from("shifts")
    .select("id,organization_id,name,days_of_week,start_time,end_time,created_by,created_at,updated_at")
    .eq("organization_id", input.organizationId)
    .order("updated_at", { ascending: false });
  return requireData(result) as Shift[];
}

export async function createShift(
  supabase: SupabaseLikeClient,
  input: {
    organizationId: string;
    name: string;
    daysOfWeek: string[];
    startTime: string;
    endTime: string;
  }
) {
  const result = await supabase
    .from("shifts")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      days_of_week: input.daysOfWeek,
      start_time: input.startTime,
      end_time: input.endTime,
    })
    .select("id,organization_id,name,days_of_week,start_time,end_time,created_by,created_at,updated_at")
    .single();
  return requireData(result) as Shift;
}

export async function deleteShift(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("shifts").delete().eq("id", id);
  requireData(result);
}

export async function listHolidays(
  supabase: SupabaseLikeClient,
  input: { organizationId: string }
) {
  const result = await supabase
    .from("holidays")
    .select("id,organization_id,name,date,notes,created_by,created_at")
    .eq("organization_id", input.organizationId)
    .order("date", { ascending: true });
  return requireData(result) as Holiday[];
}

export async function createHoliday(
  supabase: SupabaseLikeClient,
  input: { organizationId: string; name: string; date: string; notes?: string }
) {
  const result = await supabase
    .from("holidays")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      date: input.date,
      notes: input.notes ?? null,
    })
    .select("id,organization_id,name,date,notes,created_by,created_at")
    .single();
  return requireData(result) as Holiday;
}

export async function deleteHoliday(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("holidays").delete().eq("id", id);
  requireData(result);
}

export async function listMaintenanceWindows(
  supabase: SupabaseLikeClient,
  input?: { machineIds?: string[] }
) {
  let query = supabase
    .from("maintenance_windows")
    .select(
      "id,machine_id,start_time,end_time,description,created_by,created_at,updated_at,machines(id,name)"
    )
    .order("start_time", { ascending: true });

  if (input?.machineIds && input.machineIds.length) {
    query = query.in("machine_id", input.machineIds);
  }

  const result = await query;
  return requireData(result) as unknown as MaintenanceWindow[];
}

export async function createMaintenanceWindow(
  supabase: SupabaseLikeClient,
  input: {
    machineId: string;
    startTime: string;
    endTime: string;
    description?: string;
  }
) {
  const result = await supabase
    .from("maintenance_windows")
    .insert({
      machine_id: input.machineId,
      start_time: input.startTime,
      end_time: input.endTime,
      description: input.description ?? null,
    })
    .select(
      "id,machine_id,start_time,end_time,description,created_by,created_at,updated_at,machines(id,name)"
    )
    .single();
  return requireData(result) as unknown as MaintenanceWindow;
}

export async function deleteMaintenanceWindow(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("maintenance_windows").delete().eq("id", id);
  requireData(result);
}

export async function listMachineShiftAssignments(
  supabase: SupabaseLikeClient,
  input?: { machineIds?: string[] }
) {
  let query = supabase
    .from("machine_shift_assignments")
    .select("id,machine_id,shift_id,created_by,created_at,shifts(id,name,start_time,end_time,days_of_week)")
    .order("created_at", { ascending: false });

  if (input?.machineIds && input.machineIds.length) {
    query = query.in("machine_id", input.machineIds);
  }

  const result = await query;
  return requireData(result) as unknown as MachineShiftAssignment[];
}

export async function listWorkerShiftAssignments(
  supabase: SupabaseLikeClient,
  input?: { workerIds?: string[] }
) {
  let query = supabase
    .from("worker_shift_assignments")
    .select("id,worker_id,shift_id,created_by,created_at,shifts(id,name,start_time,end_time,days_of_week)")
    .order("created_at", { ascending: false });

  if (input?.workerIds && input.workerIds.length) {
    query = query.in("worker_id", input.workerIds);
  }

  const result = await query;
  return requireData(result) as unknown as WorkerShiftAssignment[];
}
