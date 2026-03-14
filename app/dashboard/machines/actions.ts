"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import { createMachine, deleteMachine, updateMachine } from "@/lib/services/machines";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

export async function saveMachineAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");
  const productionLineId = getString(formData, "productionLineId");

  const name = getString(formData, "name");
  const type = getString(formData, "type");
  const status = getString(formData, "status");
  const capacity = getNumber(formData, "capacity");
  const setupTime = getNumber(formData, "setup_time");

  if (!productionLineId) {
    redirect("/dashboard/machines?error=Select%20a%20production%20line%20first.");
  }
  if (!name) {
    redirect(
      `/dashboard/machines?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
        productionLineId
      )}&error=${encodeURIComponent("Machine name is required.")}`
    );
  }
  if (!Number.isFinite(capacity) || capacity < 0) {
    redirect(
      `/dashboard/machines?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
        productionLineId
      )}&error=${encodeURIComponent("Capacity must be a valid number (0 or more).")}`
    );
  }
  if (!Number.isFinite(setupTime) || setupTime < 0) {
    redirect(
      `/dashboard/machines?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
        productionLineId
      )}&error=${encodeURIComponent("Setup time must be a valid number (0 or more).")}`
    );
  }

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateMachine(supabase, {
        id,
        name,
        type: type ? type : null,
        status: status || "active",
        capacity,
        setupTime,
      });
    } else {
      await createMachine(supabase, {
        productionLineId,
        name,
        type,
        status: status || "active",
        capacity,
        setupTime,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save machine.";
    redirect(
      `/dashboard/machines?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
        productionLineId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/machines");
  redirect(
    `/dashboard/machines?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
      productionLineId
    )}&message=${encodeURIComponent(id ? "Machine updated." : "Machine created.")}`
  );
}

export async function deleteMachineAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");
  const productionLineId = getString(formData, "productionLineId");

  if (!id) {
    redirect("/dashboard/machines?error=Missing%20machine%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteMachine(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete machine.";
    redirect(
      `/dashboard/machines?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
        productionLineId
      )}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/machines");
  redirect(
    `/dashboard/machines?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
      productionLineId
    )}&message=Machine%20deleted.`
  );
}
