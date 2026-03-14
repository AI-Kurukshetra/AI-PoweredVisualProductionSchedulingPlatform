import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type Machine = {
  id: string;
  production_line_id: string;
  name: string;
  type: string | null;
  status: string;
  capacity: number;
  setup_time: number;
  created_by: string;
  created_at: string;
  production_lines?: { id: string; facility_id: string } | null;
};

export async function listMachines(
  supabase: SupabaseLikeClient,
  input?: { productionLineId?: string }
) {
  let query = supabase
    .from("machines")
    .select("id,production_line_id,name,type,status,capacity,setup_time,created_by,created_at")
    .order("created_at", { ascending: false });

  if (input?.productionLineId) {
    query = query.eq("production_line_id", input.productionLineId);
  }

  const result = await query;
  return requireData(result) as Machine[];
}

export async function listMachinesByFacility(
  supabase: SupabaseLikeClient,
  facilityId: string
) {
  const result = await supabase
    .from("machines")
    .select(
      "id,production_line_id,name,type,status,capacity,setup_time,created_by,created_at,production_lines(id,facility_id)"
    )
    .eq("production_lines.facility_id", facilityId)
    .order("name", { ascending: true });

  return requireData(result) as unknown as Machine[];
}

export async function createMachine(
  supabase: SupabaseLikeClient,
  input: {
    productionLineId: string;
    name: string;
    type?: string;
    status?: string;
    capacity: number;
    setupTime?: number;
  }
) {
  const result = await supabase
    .from("machines")
    .insert({
      production_line_id: input.productionLineId,
      name: input.name,
      type: input.type ? input.type : null,
      status: input.status ? input.status : "active",
      capacity: input.capacity,
      setup_time: input.setupTime ?? 0,
    })
    .select("id,production_line_id,name,type,status,capacity,setup_time,created_by,created_at")
    .single();

  return requireData(result) as Machine;
}

export async function updateMachine(
  supabase: SupabaseLikeClient,
  input: {
    id: string;
    name?: string;
    type?: string | null;
    status?: string;
    capacity?: number;
    setupTime?: number;
  }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string") patch.name = input.name;
  if (input.type !== undefined) patch.type = input.type;
  if (typeof input.status === "string") patch.status = input.status;
  if (typeof input.capacity === "number") patch.capacity = input.capacity;
  if (typeof input.setupTime === "number") patch.setup_time = input.setupTime;

  const result = await supabase
    .from("machines")
    .update(patch)
    .eq("id", input.id)
    .select("id,production_line_id,name,type,status,capacity,setup_time,created_by,created_at")
    .single();

  return requireData(result) as Machine;
}

export async function deleteMachine(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("machines").delete().eq("id", id);
  requireData(result);
}
