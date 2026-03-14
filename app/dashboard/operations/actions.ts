"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import { createOperation, deleteOperation, updateOperation } from "@/lib/services/operations";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function getDependencies(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
}

export async function saveOperationAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");
  const productionLineId = getString(formData, "productionLineId");
  const workOrderId = getString(formData, "workOrderId");
  const name = getString(formData, "name");
  const sequence = getNumber(formData, "sequence");
  const quantity = getNumber(formData, "quantity");
  const priority = getNumber(formData, "priority");
  const deadline = getString(formData, "deadline");
  const status = getString(formData, "status");
  const plannedStart = getString(formData, "plannedStart");
  const plannedEnd = getString(formData, "plannedEnd");
  const machineId = getString(formData, "machineId");
  const workerId = getString(formData, "workerId");
  const dependencyIds = getDependencies(formData, "dependencyIds");

  if (!organizationId || !workOrderId) {
    redirect("/dashboard/operations?error=Select%20an%20organization%20and%20work%20order.");
  }
  if (!name) {
    redirect(
      `/dashboard/operations?organizationId=${encodeURIComponent(
        organizationId
      )}&workOrderId=${encodeURIComponent(workOrderId)}&error=Operation%20name%20is%20required.`
    );
  }
  if (sequence === null) {
    redirect(
      `/dashboard/operations?organizationId=${encodeURIComponent(
        organizationId
      )}&workOrderId=${encodeURIComponent(workOrderId)}&error=Sequence%20is%20required.`
    );
  }
  if (quantity === null) {
    redirect(
      `/dashboard/operations?organizationId=${encodeURIComponent(
        organizationId
      )}&workOrderId=${encodeURIComponent(workOrderId)}&error=Quantity%20is%20required.`
    );
  }
  if (priority === null) {
    redirect(
      `/dashboard/operations?organizationId=${encodeURIComponent(
        organizationId
      )}&workOrderId=${encodeURIComponent(workOrderId)}&error=Priority%20is%20required.`
    );
  }

  const normalizedDeps = dependencyIds.filter((depId) => depId && depId !== id);

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateOperation(supabase, {
        id,
        productionLineId: productionLineId ? productionLineId : null,
        machineId: machineId ? machineId : null,
        workerId: workerId ? workerId : null,
        name,
        sequence,
        quantity,
        priority,
        deadline: deadline ? deadline : null,
        status: status || "pending",
        dependencyIds: normalizedDeps,
        plannedStart: plannedStart ? plannedStart : null,
        plannedEnd: plannedEnd ? plannedEnd : null,
      });
    } else {
      await createOperation(supabase, {
        workOrderId,
        productionLineId: productionLineId ? productionLineId : null,
        machineId: machineId ? machineId : null,
        workerId: workerId ? workerId : null,
        name,
        sequence,
        quantity,
        priority,
        deadline: deadline ? deadline : null,
        status: status || "pending",
        dependencyIds: normalizedDeps,
        plannedStart: plannedStart ? plannedStart : null,
        plannedEnd: plannedEnd ? plannedEnd : null,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save operation.";
    redirect(
      `/dashboard/operations?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
        productionLineId
      )}&workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/operations");
  redirect(
    `/dashboard/operations?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
      productionLineId
    )}&workOrderId=${encodeURIComponent(
      workOrderId
    )}&message=${encodeURIComponent(id ? "Operation updated." : "Operation created.")}`
  );
}

export async function deleteOperationAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");
  const productionLineId = getString(formData, "productionLineId");
  const workOrderId = getString(formData, "workOrderId");

  if (!id) {
    redirect("/dashboard/operations?error=Missing%20operation%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteOperation(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete operation.";
    redirect(
      `/dashboard/operations?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
        productionLineId
      )}&workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/operations");
  redirect(
    `/dashboard/operations?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
      productionLineId
    )}&workOrderId=${encodeURIComponent(workOrderId)}&message=Operation%20deleted.`
  );
}

