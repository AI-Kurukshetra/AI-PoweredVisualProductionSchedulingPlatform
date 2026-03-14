import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type Supplier = {
  id: string;
  organization_id: string;
  name: string;
  contact: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

export async function listSuppliers(
  supabase: SupabaseLikeClient,
  input: { organizationId: string }
) {
  const result = await supabase
    .from("suppliers")
    .select("id,organization_id,name,contact,notes,created_by,created_at")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false });

  return requireData(result) as Supplier[];
}

export async function createSupplier(
  supabase: SupabaseLikeClient,
  input: { organizationId: string; name: string; contact?: string; notes?: string }
) {
  const result = await supabase
    .from("suppliers")
    .insert({
      organization_id: input.organizationId,
      name: input.name,
      contact: input.contact ? input.contact : null,
      notes: input.notes ? input.notes : null,
    })
    .select("id,organization_id,name,contact,notes,created_by,created_at")
    .single();

  return requireData(result) as Supplier;
}

export async function updateSupplier(
  supabase: SupabaseLikeClient,
  input: { id: string; name?: string; contact?: string | null; notes?: string | null }
) {
  const patch: Record<string, unknown> = {};
  if (typeof input.name === "string") patch.name = input.name;
  if (input.contact !== undefined) patch.contact = input.contact;
  if (input.notes !== undefined) patch.notes = input.notes;

  const result = await supabase
    .from("suppliers")
    .update(patch)
    .eq("id", input.id)
    .select("id,organization_id,name,contact,notes,created_by,created_at")
    .single();

  return requireData(result) as Supplier;
}

export async function deleteSupplier(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase.from("suppliers").delete().eq("id", id);
  requireData(result);
}

