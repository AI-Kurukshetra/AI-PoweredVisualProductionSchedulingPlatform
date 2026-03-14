"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import {
  createProductionLine,
  deleteProductionLine,
  updateProductionLine,
} from "@/lib/services/production-lines";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export async function saveProductionLineAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");
  const name = getString(formData, "name");
  const description = getString(formData, "description");
  const capacity = getNumber(formData, "capacity");

  if (!facilityId) {
    redirect("/dashboard/production-lines?error=Select%20a%20facility%20first.");
  }
  if (!name) {
    redirect(
      `/dashboard/production-lines?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(
        "Production line name is required."
      )}`
    );
  }
  if (!Number.isFinite(capacity) || capacity < 0) {
    redirect(
      `/dashboard/production-lines?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(
        "Capacity must be a valid number (0 or more)."
      )}`
    );
  }

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateProductionLine(supabase, {
        id,
        name,
        capacity,
        description: description ? description : null,
      });
    } else {
      await createProductionLine(supabase, { facilityId, name, capacity, description });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save production line.";
    redirect(
      `/dashboard/production-lines?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/production-lines");
  redirect(
    `/dashboard/production-lines?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&message=${encodeURIComponent(
      id ? "Production line updated." : "Production line created."
    )}`
  );
}

export async function deleteProductionLineAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");

  if (!id) {
    redirect("/dashboard/production-lines?error=Missing%20production%20line%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteProductionLine(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete production line.";
    redirect(
      `/dashboard/production-lines?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/production-lines");
  redirect(
    `/dashboard/production-lines?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&message=Production%20line%20deleted.`
  );
}

// Note: saveProductionLineAction handles both create and update.
