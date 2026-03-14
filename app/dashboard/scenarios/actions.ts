"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/actions";
import { createScenario, deleteScenario, insertScenarioTasks, updateScenarioTask } from "@/lib/services/scenarios";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formatIsoFromLocalDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function createScenarioFromLiveAction(formData: FormData) {
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");
  const name = getString(formData, "name");
  const description = getString(formData, "description");
  const rangeDaysRaw = getString(formData, "rangeDays");
  const rangeDays = Math.max(1, Math.min(90, Number(rangeDaysRaw) || 30));

  if (!organizationId || !name) {
    redirect("/dashboard/scenarios?error=Select%20an%20organization%20and%20provide%20a%20name.");
  }

  const now = Date.now();
  const startMs = now - rangeDays * 24 * 60 * 60 * 1000;
  const rangeStart = new Date(startMs).toISOString();
  const rangeEnd = new Date(now).toISOString();

  const supabase = await createSupabaseActionClient();

  let scenarioId = "";
  try {
    const scenario = await createScenario(supabase, {
      organizationId,
      facilityId: facilityId ? facilityId : null,
      name,
      description: description ? description : undefined,
      rangeStart,
      rangeEnd,
    });
    scenarioId = scenario.id;

    let query = supabase
      .from("scheduling_tasks")
      .select(
        "id,work_order_id,operation_id,production_line_id,machine_id,worker_id,start_time,end_time,status,notes,work_orders(id,organization_id),production_lines(id,facility_id)"
      )
      .not("start_time", "is", null)
      .not("end_time", "is", null)
      .eq("work_orders.organization_id", organizationId)
      .gte("start_time", rangeStart)
      .lte("start_time", rangeEnd);

    if (facilityId) {
      query = query.eq("production_lines.facility_id", facilityId);
    }

    const result = await query;
    if (result.error) {
      throw result.error;
    }

    const rows = (result.data ?? []) as unknown as Array<{
      id: string;
      work_order_id: string;
      operation_id: string | null;
      production_line_id: string | null;
      machine_id: string | null;
      worker_id: string | null;
      start_time: string | null;
      end_time: string | null;
      status: string;
      notes: string | null;
    }>;

    await insertScenarioTasks(supabase, {
      scenarioId,
      tasks: rows.map((r) => ({
        baseTaskId: r.id,
        workOrderId: r.work_order_id,
        operationId: r.operation_id,
        productionLineId: r.production_line_id,
        machineId: r.machine_id,
        workerId: r.worker_id,
        startTime: r.start_time,
        endTime: r.end_time,
        status: r.status,
        notes: r.notes,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create scenario.";
    redirect(
      `/dashboard/scenarios?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/scenarios");
  redirect(`/dashboard/scenarios/${encodeURIComponent(scenarioId)}?message=Scenario%20created.`);
}

export async function deleteScenarioAction(formData: FormData) {
  const id = getString(formData, "id");
  const organizationId = getString(formData, "organizationId");
  const facilityId = getString(formData, "facilityId");

  if (!id) {
    redirect("/dashboard/scenarios?error=Missing%20scenario%20id.");
  }

  const supabase = await createSupabaseActionClient();
  try {
    await deleteScenario(supabase, id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete scenario.";
    redirect(
      `/dashboard/scenarios?organizationId=${encodeURIComponent(
        organizationId
      )}&facilityId=${encodeURIComponent(facilityId)}&error=${encodeURIComponent(message)}`
    );
  }

  revalidatePath("/dashboard/scenarios");
  redirect(
    `/dashboard/scenarios?organizationId=${encodeURIComponent(
      organizationId
    )}&facilityId=${encodeURIComponent(facilityId)}&message=Scenario%20deleted.`
  );
}

export async function updateScenarioTaskAction(formData: FormData) {
  const id = getString(formData, "id");
  const scenarioId = getString(formData, "scenarioId");
  const workOrderId = getString(formData, "workOrderId");
  const productionLineId = getString(formData, "productionLineId");
  const machineId = getString(formData, "machineId");
  const workerId = getString(formData, "workerId");
  const startTimeLocal = getString(formData, "startTime");
  const endTimeLocal = getString(formData, "endTime");
  const notes = getString(formData, "notes");

  if (!id || !scenarioId) {
    redirect("/dashboard/scenarios?error=Missing%20scenario%20task%20id.");
  }

  const supabase = await createSupabaseActionClient();
  try {
    await updateScenarioTask(supabase, {
      id,
      productionLineId: productionLineId ? productionLineId : null,
      machineId: machineId ? machineId : null,
      workerId: workerId ? workerId : null,
      startTime: formatIsoFromLocalDateTime(startTimeLocal),
      endTime: formatIsoFromLocalDateTime(endTimeLocal),
      notes: notes ? notes : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update scenario task.";
    redirect(`/dashboard/scenarios/${encodeURIComponent(scenarioId)}?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/dashboard/scenarios/${scenarioId}`);
  redirect(
    `/dashboard/scenarios/${encodeURIComponent(
      scenarioId
    )}?workOrderId=${encodeURIComponent(workOrderId)}&message=Scenario%20task%20updated.`
  );
}

