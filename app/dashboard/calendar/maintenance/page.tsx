import { redirect } from "next/navigation";
import { listMaintenanceWindows, type MaintenanceWindow } from "@/lib/services/calendar";
import { listFacilities, type Facility } from "@/lib/services/facilities";
import { listMachinesByFacility, type Machine } from "@/lib/services/machines";
import { listOrganizations, type Organization } from "@/lib/services/organizations";
import {
  isSchemaCacheMissMessage,
  normalizeCalendarSchemaError,
} from "@/lib/services/supabase-helpers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createMaintenanceWindowAction,
  deleteMaintenanceWindowAction,
} from "../actions";
import ConfirmSubmitDialog from "@/app/components/ConfirmSubmitDialog";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const message = typeof params.message === "string" ? params.message : "";
  const error = normalizeCalendarSchemaError(
    typeof params.error === "string" ? params.error : ""
  );
  const organizationId = typeof params.organizationId === "string" ? params.organizationId : "";
  const facilityId = typeof params.facilityId === "string" ? params.facilityId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/calendar/maintenance");
  }

  let organizations: Organization[] = [];
  let orgError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    orgError = normalizeCalendarSchemaError(e, "Unable to load organizations.");
  }

  const selectedOrgId = organizationId || organizations[0]?.id || "";

  let facilities: Facility[] = [];
  try {
    if (selectedOrgId) {
      facilities = await listFacilities(supabase, { organizationId: selectedOrgId });
    }
  } catch (e) {
    orgError = normalizeCalendarSchemaError(e, "Unable to load facilities.");
  }

  const selectedFacilityId = facilityId || facilities[0]?.id || "";

  let machines: Machine[] = [];
  try {
    if (selectedFacilityId) {
      machines = await listMachinesByFacility(supabase, selectedFacilityId);
    }
  } catch (e) {
    orgError = normalizeCalendarSchemaError(e, "Unable to load machines.");
  }

  const machineIds = machines.map((machine) => machine.id);
  let maintenance: MaintenanceWindow[] = [];
  try {
    maintenance = machineIds.length
      ? await listMaintenanceWindows(supabase, { machineIds })
      : [];
  } catch (e) {
    orgError = normalizeCalendarSchemaError(e, "Unable to load maintenance windows.");
  }

  const displayError = error || orgError;
  const schemaMissing = isSchemaCacheMissMessage(displayError);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">Maintenance</p>
            <h1 className="mt-2 text-3xl font-semibold text-black dark:text-white">Maintenance windows</h1>
            <p className="text-sm text-black/60 dark:text-white/60">
              Block out machine downtime so schedulers keep tasks away from repairs.
            </p>
          </div>
          <form className="flex flex-wrap items-center gap-3" method="get">
            <select
              name="organizationId"
              defaultValue={selectedOrgId}
              className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <select
              name="facilityId"
              defaultValue={selectedFacilityId}
              className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
            >
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Update
            </button>
          </form>
        </div>
        {displayError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {displayError}
          </div>
        ) : null}
        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            {message}
          </div>
        ) : null}
      </div>

      {schemaMissing ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          Calendar tables are not available in this Supabase project yet. Run
          ` supabase/migrations/20260315140000_create_calendar_tables.sql `
          in the Supabase SQL Editor, then reload the page.
        </div>
      ) : null}

      {!schemaMissing ? <div className="space-y-3">
        {maintenance.length ? (
          maintenance.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-black/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-black dark:text-white">
                    {entry.machines?.name ?? "Machine"}
                  </div>
                  <p className="text-sm text-black/60 dark:text-white/60">
                    {entry.start_time} → {entry.end_time}
                  </p>
                </div>
                <div>
                  <form
                    id={`delete-maintenance-${entry.id}`}
                    action={deleteMaintenanceWindowAction}
                    className="hidden"
                  >
                    <input type="hidden" name="id" value={entry.id} />
                  </form>
                  <ConfirmSubmitDialog
                    formId={`delete-maintenance-${entry.id}`}
                    trigger={
                      <button
                        type="button"
                        className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black/60 hover:border-black/30 dark:border-white/10 dark:text-white/60 dark:hover:border-white/30"
                      >
                        Delete
                      </button>
                    }
                    title="Delete maintenance window"
                    description="Remove this downtime block."
                  />
                </div>
              </div>
              {entry.description ? (
                <p className="mt-2 text-sm text-black/70 dark:text-white/70">{entry.description}</p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-black/10 bg-white/80 p-6 text-sm text-black/60 dark:border-white/10 dark:bg-black/30">
            No maintenance windows defined for this facility yet.
          </div>
        )}
      </div> : null}

      {!schemaMissing ? <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <h2 className="text-xl font-semibold text-black dark:text-white">Create maintenance window</h2>
        <form action={createMaintenanceWindowAction} className="mt-4 grid gap-4">
          <label className="block">
            <span className="text-sm font-medium text-black dark:text-white">Machine</span>
            <select
              name="machineId"
              required
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
            >
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.name}
                </option>
              ))}
              {!machines.length ? <option value="">No machines found</option> : null}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-black dark:text-white">Start</span>
              <input
                name="startTime"
                type="datetime-local"
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-black dark:text-white">End</span>
              <input
                name="endTime"
                type="datetime-local"
                required
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-black dark:text-white">Description</span>
            <input
              name="description"
              placeholder="Optional notes"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Save maintenance
          </button>
        </form>
      </div> : null}
    </div>
  );
}
