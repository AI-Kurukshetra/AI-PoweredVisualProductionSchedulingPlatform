import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type Worker = {
  id: string;
  facility_id: string;
  name: string;
  role: string | null;
  skills: string | null;
  shift_availability: string;
  created_by: string;
  created_at: string;
};

export async function listWorkers(supabase: SupabaseLikeClient, input?: { facilityId?: string }) {
  let query = supabase
    .from("workers")
    .select("id,facility_id,name,role,skills,shift_availability,created_by,created_at")
    .order("created_at", { ascending: false });

  if (input?.facilityId) {
    query = query.eq("facility_id", input.facilityId);
  }

  const result = await query;
  return requireData(result) as Worker[];
}

export async function createWorker(
  supabase: SupabaseLikeClient,
  input: {
    facilityId: string;
    name: string;
    role?: string;
    skills?: string;
    shiftAvailability?: string;
  }
) {
  const result = await supabase
    .from("workers")
    .insert({
      facility_id: input.facilityId,
      name: input.name,
      role: input.role ? input.role : null,
      skills: input.skills ? input.skills : null,
      shift_availability: input.shiftAvailability ? input.shiftAvailability : "any",
    })
    .select("id,facility_id,name,role,skills,shift_availability,created_by,created_at")
    .single();

  return requireData(result) as Worker;
}

export async function updateWorker(
  supabase: SupabaseLikeClient,
  input: {
    id: string;
    name?: string;
    role?: string | null;
    skills?: string | null;
    shiftAvailability?: string;
  }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string") patch.name = input.name;
  if (input.role !== undefined) patch.role = input.role;
  if (input.skills !== undefined) patch.skills = input.skills;
  if (typeof input.shiftAvailability === "string")
    patch.shift_availability = input.shiftAvailability;

  const result = await supabase
    .from("workers")
    .update(patch)
    .eq("id", input.id)
    .select("id,facility_id,name,role,skills,shift_availability,created_by,created_at")
    .single();

  return requireData(result) as Worker;
}

export async function deleteWorker(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("workers").delete().eq("id", id);
  requireData(result);
}
