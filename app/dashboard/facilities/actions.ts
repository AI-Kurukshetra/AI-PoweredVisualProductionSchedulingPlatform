"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import { createFacility, deleteFacility, updateFacility } from "@/lib/services/facilities";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveFacilityAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const name = getString(formData, "name");
  const description = getString(formData, "description");

  if (!organizationId) {
    redirect("/dashboard/facilities?error=Select%20an%20organization%20first.");
  }
  if (!name) {
    redirect(`/dashboard/facilities?organizationId=${encodeURIComponent(organizationId)}&error=${encodeURIComponent("Facility name is required.")}`);
  }

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateFacility(supabase, {
        id,
        name,
        description: description ? description : null,
      });
    } else {
      await createFacility(supabase, { organizationId, name, description });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save facility.";
    redirect(
      `/dashboard/facilities?organizationId=${encodeURIComponent(
        organizationId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/facilities");
  redirect(
    `/dashboard/facilities?organizationId=${encodeURIComponent(
      organizationId
    )}&message=${encodeURIComponent(id ? "Facility updated." : "Facility created.")}`
  );
}

export async function deleteFacilityAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");

  if (!id) {
    redirect("/dashboard/facilities?error=Missing%20facility%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteFacility(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete facility.";
    const qp = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}&` : "?";
    redirect(`/dashboard/facilities${qp}error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/facilities");
  const qp = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}&` : "?";
  redirect(`/dashboard/facilities${qp}message=Facility%20deleted.`);
}
