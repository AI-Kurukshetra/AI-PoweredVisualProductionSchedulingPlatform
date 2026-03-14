"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import {
  createOrganization,
  deleteOrganization,
  updateOrganization,
} from "@/lib/services/organizations";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveOrganizationAction(formData: FormData) {
  const id = getString(formData, "id");
  const name = getString(formData, "name");
  const description = getString(formData, "description");

  if (!name) {
    redirect("/dashboard/organizations?error=Organization%20name%20is%20required.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateOrganization(supabase, {
        id,
        name,
        description: description ? description : null,
      });
    } else {
      await createOrganization(supabase, { name, description });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save organization.";
    redirect(`/dashboard/organizations?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/organizations");
  redirect(
    `/dashboard/organizations?message=${encodeURIComponent(
      id ? "Organization updated." : "Organization created."
    )}`
  );
}

export async function deleteOrganizationAction(formData: FormData) {
  const id = getString(formData, "id");
  if (!id) {
    redirect("/dashboard/organizations?error=Missing%20organization%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteOrganization(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete organization.";
    redirect(`/dashboard/organizations?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/organizations");
  redirect("/dashboard/organizations?message=Organization%20deleted.");
}
