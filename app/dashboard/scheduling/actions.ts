"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import {
  createSchedulingTask,
  deleteSchedulingTask,
  updateSchedulingTask,
} from "@/lib/services/scheduling-tasks";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveSchedulingTaskAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");
  const productionLineId = getString(formData, "productionLineId");
  const workOrderId = getString(formData, "workOrderId");
  const operationId = getString(formData, "operationId");
  const machineId = getString(formData, "machineId");
  const workerId = getString(formData, "workerId");
  const startTime = getString(formData, "startTime");
  const endTime = getString(formData, "endTime");
  const status = getString(formData, "status");
  const notes = getString(formData, "notes");

  if (!organizationId || !workOrderId) {
    redirect("/dashboard/scheduling?error=Select%20an%20organization%20and%20work%20order.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    if (id) {
      await updateSchedulingTask(supabase, {
        id,
        operationId: operationId ? operationId : null,
        productionLineId: productionLineId ? productionLineId : null,
        machineId: machineId ? machineId : null,
        workerId: workerId ? workerId : null,
        startTime: startTime ? startTime : null,
        endTime: endTime ? endTime : null,
        status: status || "scheduled",
        notes: notes ? notes : null,
      });
    } else {
      await createSchedulingTask(supabase, {
        workOrderId,
        operationId: operationId ? operationId : null,
        productionLineId: productionLineId ? productionLineId : null,
        machineId: machineId ? machineId : null,
        workerId: workerId ? workerId : null,
        startTime: startTime ? startTime : null,
        endTime: endTime ? endTime : null,
        status: status || "scheduled",
        notes,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save scheduling task.";
    redirect(
      `/dashboard/scheduling?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
        productionLineId
      )}&workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/scheduling");
  redirect(
    `/dashboard/scheduling?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
      productionLineId
    )}&workOrderId=${encodeURIComponent(
      workOrderId
    )}&message=${encodeURIComponent(id ? "Scheduling task updated." : "Scheduling task created.")}`
  );
}

export async function deleteSchedulingTaskAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");
  const productionLineId = getString(formData, "productionLineId");
  const workOrderId = getString(formData, "workOrderId");

  if (!id) {
    redirect("/dashboard/scheduling?error=Missing%20task%20id.");
  }

  const supabase = await createSupabaseActionClient();

  try {
    await deleteSchedulingTask(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete scheduling task.";
    redirect(
      `/dashboard/scheduling?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
        productionLineId
      )}&workOrderId=${encodeURIComponent(workOrderId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/scheduling");
  redirect(
    `/dashboard/scheduling?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&productionLineId=${encodeURIComponent(
      productionLineId
    )}&workOrderId=${encodeURIComponent(workOrderId)}&message=Scheduling%20task%20deleted.`
  );
}

