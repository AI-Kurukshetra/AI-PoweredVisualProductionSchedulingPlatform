"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import { createWorker, deleteWorker, updateWorker } from "@/lib/services/workers";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveWorkerAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");

  const name = getString(formData, "name");
  const role = getString(formData, "role");
  const skills = getString(formData, "skills");
  const shiftAvailability = getString(formData, "shift_availability");

  if (!facilityId) {
    redirect("/dashboard/workers?error=Select%20a%20facility%20first.");
  }
  if (!name) {
    redirect(
      `/dashboard/workers?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(
        "Worker name is required."
      )}`
    );
  }

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateWorker(supabase, {
        id,
        name,
        role: role ? role : null,
        skills: skills ? skills : null,
        shiftAvailability: shiftAvailability || "any",
      });
    } else {
      await createWorker(supabase, {
        facilityId,
        name,
        role,
        skills,
        shiftAvailability: shiftAvailability || "any",
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save worker.";
    redirect(
      `/dashboard/workers?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/workers");
  redirect(
    `/dashboard/workers?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&message=${encodeURIComponent(
      id ? "Worker updated." : "Worker created."
    )}`
  );
}

export async function deleteWorkerAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");

  if (!id) {
    redirect("/dashboard/workers?error=Missing%20worker%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteWorker(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete worker.";
    redirect(
      `/dashboard/workers?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/workers");
  redirect(
    `/dashboard/workers?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&message=Worker%20deleted.`
  );
}
