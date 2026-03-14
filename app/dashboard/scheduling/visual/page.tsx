import Link from "next/link";
import { redirect } from "next/navigation";
import SchedulerBoard from "./SchedulerBoard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type Holiday,
  listHolidays,
  listMachineShiftAssignments,
  listMaintenanceWindows,
  listShifts,
  listWorkerShiftAssignments,
  type MachineShiftAssignment,
  type MaintenanceWindow,
  type Shift,
  type WorkerShiftAssignment,
} from "@/lib/services/calendar";
import { listFacilities, type Facility } from "@/lib/services/facilities";
import { listOrganizations, type Organization } from "@/lib/services/organizations";
import {
  listProductionLines,
  type ProductionLineWithFacility,
} from "@/lib/services/production-lines";
import {
  listSchedulingTasks,
  type SchedulingTaskWithRefs,
} from "@/lib/services/scheduling-tasks";
import { normalizeCalendarSchemaError } from "@/lib/services/supabase-helpers";
import { listWorkOrders, type WorkOrderWithProduct } from "@/lib/services/work-orders";

export default async function SchedulingVisualPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";
  const facilityId = typeof sp.facilityId === "string" ? sp.facilityId : "";
  const workOrderId = typeof sp.workOrderId === "string" ? sp.workOrderId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/scheduling/visual");
  }

  let organizations: Organization[] = [];
  let orgLoadError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    orgLoadError = e instanceof Error ? e.message : "Failed to load organizations.";
  }

  const selectedOrgId = organizationId || organizations[0]?.id || "";

  let facilities: Facility[] = [];
  let facilitiesError = "";
  try {
    facilities =
      selectedOrgId && selectedOrgId !== ""
        ? await listFacilities(supabase, { organizationId: selectedOrgId })
        : [];
  } catch (e) {
    facilitiesError = e instanceof Error ? e.message : "Failed to load facilities.";
  }

  const selectedFacilityId = facilityId || facilities[0]?.id || "";

  let productionLines: ProductionLineWithFacility[] = [];
  let productionLinesError = "";
  try {
    productionLines =
      selectedFacilityId && selectedFacilityId !== ""
        ? await listProductionLines(supabase, { facilityId: selectedFacilityId })
        : [];
  } catch (e) {
    productionLinesError = e instanceof Error ? e.message : "Failed to load production lines.";
  }

  let workOrders: WorkOrderWithProduct[] = [];
  let workOrdersError = "";
  try {
    workOrders =
      selectedOrgId && selectedOrgId !== ""
        ? await listWorkOrders(supabase, { organizationId: selectedOrgId })
        : [];
  } catch (e) {
    workOrdersError = e instanceof Error ? e.message : "Failed to load work orders.";
  }

  const selectedWorkOrderId = workOrderId || workOrders[0]?.id || "";
  const selectedWorkOrder = workOrders.find((order) => order.id === selectedWorkOrderId) ?? null;

  let tasks: SchedulingTaskWithRefs[] = [];
  let tasksError = "";
  try {
    tasks =
      selectedWorkOrderId && selectedWorkOrderId !== ""
        ? await listSchedulingTasks(supabase, { workOrderId: selectedWorkOrderId })
        : [];
  } catch (e) {
    tasksError = e instanceof Error ? e.message : "Failed to load scheduling tasks.";
  }

  let shifts: Shift[] = [];
  let holidays: Holiday[] = [];
  let maintenanceWindows: MaintenanceWindow[] = [];
  let machineShiftAssignments: MachineShiftAssignment[] = [];
  let workerShiftAssignments: WorkerShiftAssignment[] = [];
  let calendarError = "";
  try {
    if (selectedOrgId) {
      shifts = await listShifts(supabase, { organizationId: selectedOrgId });
      holidays = await listHolidays(supabase, { organizationId: selectedOrgId });
    }

    const machineIds = tasks
      .map((task) => task.machine_id)
      .filter((value): value is string => Boolean(value));
    const workerIds = tasks
      .map((task) => task.worker_id)
      .filter((value): value is string => Boolean(value));

    maintenanceWindows = machineIds.length
      ? await listMaintenanceWindows(supabase, { machineIds })
      : [];
    machineShiftAssignments = machineIds.length
      ? await listMachineShiftAssignments(supabase, { machineIds })
      : [];
    workerShiftAssignments = workerIds.length
      ? await listWorkerShiftAssignments(supabase, { workerIds })
      : [];
  } catch (e) {
    calendarError = normalizeCalendarSchemaError(e, "Failed to load calendar metadata.");
  }

  const anyLoadError =
    orgLoadError ||
    facilitiesError ||
    productionLinesError ||
    workOrdersError ||
    tasksError ||
    calendarError;
  // eslint-disable-next-line react-hooks/purity
  const fallbackTimestamp = Date.now();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-black/40 dark:text-white/60">Scheduling studio</p>
          <h1 className="text-3xl font-semibold text-black dark:text-white">Drag-and-drop visual scheduler</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Arrange work order operations across your production lines, machines, and talent.
            Move or stretch tasks to lock scheduling in place with instant sync to Supabase.
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-wrap gap-3">
          <Link
            href="/dashboard/work-orders"
            className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-black transition hover:border-black/30 dark:border-white/10 dark:text-white dark:hover:border-white/40"
          >
            Open work orders
          </Link>
          <Link
            href="/dashboard/scheduling"
            className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Task list
          </Link>
        </div>
      </div>

      <form className="grid gap-3 rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30 md:grid-cols-4" method="get">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">Organization</span>
          <select
            name="organizationId"
            defaultValue={selectedOrgId}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
          >
            {organizations.length ? (
              organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))
            ) : (
              <option value="">No organizations</option>
            )}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">Facility</span>
          <select
            name="facilityId"
            defaultValue={selectedFacilityId}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
          >
            {facilities.length ? (
              facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))
            ) : (
              <option value="">No facilities yet</option>
            )}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">Work order</span>
          <select
            name="workOrderId"
            defaultValue={selectedWorkOrderId}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
          >
            {workOrders.length ? (
              workOrders.map((workOrder) => (
                <option key={workOrder.id} value={workOrder.id}>
                  {workOrder.products?.name ?? "Work order"} · {workOrder.status}
                </option>
              ))
            ) : (
              <option value="">No work orders</option>
            )}
          </select>
        </label>
        <button
          type="submit"
          className="w-full rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          Update board
        </button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      {anyLoadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {normalizeCalendarSchemaError(anyLoadError) !== anyLoadError ? (
            <>
              {normalizeCalendarSchemaError(anyLoadError)}
            </>
          ) : (
            anyLoadError
          )}
        </div>
      ) : null}

      {selectedWorkOrderId ? (
        <SchedulerBoard
          initialTasks={tasks}
          productionLines={productionLines}
          selectedWorkOrderId={selectedWorkOrderId}
          selectedWorkOrderLabel={
            selectedWorkOrder
              ? `${selectedWorkOrder.products?.name ?? "Work order"} · ${selectedWorkOrder.status}`
              : undefined
          }
          organizationId={selectedOrgId}
          facilityId={selectedFacilityId || null}
          fallbackTimestamp={fallbackTimestamp}
          shifts={shifts}
          holidays={holidays}
          maintenanceWindows={maintenanceWindows}
          machineShiftAssignments={machineShiftAssignments}
          workerShiftAssignments={workerShiftAssignments}
        />
      ) : (
        <div className="rounded-2xl border border-black/10 bg-white/80 p-6 text-sm text-black/60 dark:border-white/10 dark:bg-black/30 dark:text-white/60">
          Select an organization and work order to see their scheduling timeline.
        </div>
      )}
    </div>
  );
}
