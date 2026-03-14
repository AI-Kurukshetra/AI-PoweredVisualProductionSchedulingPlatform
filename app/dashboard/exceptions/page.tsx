import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listFacilities } from "@/lib/services/facilities";
import { isSchemaCacheMissMessage } from "@/lib/services/supabase-helpers";
import { listAlerts, type Alert } from "@/lib/services/alerts";
import { resolveAlertAction, runExceptionDetectionAction } from "./actions";

function severityColor(severity: string) {
  if (severity === "critical") return "bg-red-600";
  if (severity === "high") return "bg-amber-600";
  if (severity === "medium") return "bg-blue-600";
  return "bg-slate-600";
}

function typeLabel(type: string) {
  return type.replace(/_/g, " ");
}

function formatWhen(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().replace("T", " ").slice(0, 16);
}

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";
  const facilityId = typeof sp.facilityId === "string" ? sp.facilityId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/exceptions");
  }

  let organizations: Awaited<ReturnType<typeof listOrganizations>> = [];
  let orgError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    orgError = e instanceof Error ? e.message : "Failed to load organizations.";
  }

  const selectedOrgId = organizationId || organizations[0]?.id || "";

  let facilities: Awaited<ReturnType<typeof listFacilities>> = [];
  let facilitiesError = "";
  try {
    facilities = selectedOrgId ? await listFacilities(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    facilitiesError = e instanceof Error ? e.message : "Failed to load facilities.";
  }

  const selectedFacilityId = facilityId || facilities[0]?.id || "";

  let alerts: Alert[] = [];
  let alertsError = "";
  try {
    alerts = selectedOrgId
      ? await listAlerts(supabase, {
          organizationId: selectedOrgId,
          facilityId: selectedFacilityId ? selectedFacilityId : undefined,
          status: "open",
          limit: 100,
        })
      : [];
  } catch (e) {
    alertsError = e instanceof Error ? e.message : "Failed to load alerts.";
  }

  const anyLoadError = orgError || facilitiesError || alertsError;

  const schemaMissing = isSchemaCacheMissMessage(anyLoadError) || isSchemaCacheMissMessage(error);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
              Exception management
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-black dark:text-white">
              Alerts and conflict detection
            </h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              Detect schedule conflicts, machine overload, worker unavailability, and material shortages.
            </p>
          </div>
          <form action={runExceptionDetectionAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="facilityId" value={selectedFacilityId} />
            <button
              type="submit"
              className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              disabled={!selectedOrgId || schemaMissing}
              title={!selectedOrgId ? "Select an organization first" : undefined}
            >
              Run scan
            </button>
          </form>
        </div>

        <form method="get" className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
              Organization
            </span>
            <select
              name="organizationId"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
              defaultValue={selectedOrgId}
            >
              {organizations.length ? (
                organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))
              ) : (
                <option value="">No organizations</option>
              )}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
              Facility
            </span>
            <select
              name="facilityId"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
              defaultValue={selectedFacilityId}
              disabled={!selectedOrgId}
            >
              {facilities.length ? (
                facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))
              ) : (
                <option value="">No facilities</option>
              )}
            </select>
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
            >
              Apply filters
            </button>
          </div>
        </form>

        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            {message}
          </div>
        ) : null}

        {anyLoadError ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
            {schemaMissing ? (
              <>
                Exception alerts table is not deployed in Supabase yet. Run
                `supabase/migrations/20260316120000_create_alerts.sql` in Supabase SQL Editor, reload
                the PostgREST schema cache, then refresh.
              </>
            ) : (
              anyLoadError
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-black dark:text-white">Open alerts</h2>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              {alerts.length ? `${alerts.length} active exceptions found.` : "No exceptions detected."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:border-black/30 dark:border-white/10 dark:text-white/70 dark:hover:border-white/40"
              href={`/dashboard/scheduling/visual?organizationId=${encodeURIComponent(
                selectedOrgId
              )}&facilityId=${encodeURIComponent(selectedFacilityId)}`}
            >
              Visual planner
            </Link>
            <Link
              className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:border-black/30 dark:border-white/10 dark:text-white/70 dark:hover:border-white/40"
              href={`/dashboard/inventory?organizationId=${encodeURIComponent(
                selectedOrgId
              )}&facilityId=${encodeURIComponent(selectedFacilityId)}`}
            >
              Inventory
            </Link>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {alerts.map((alert) => {
            const rescheduleHref = alert.work_order_id
              ? `/dashboard/scheduling/visual?organizationId=${encodeURIComponent(
                  selectedOrgId
                )}&facilityId=${encodeURIComponent(selectedFacilityId)}&workOrderId=${encodeURIComponent(
                  alert.work_order_id
                )}`
              : `/dashboard/scheduling/visual?organizationId=${encodeURIComponent(
                  selectedOrgId
                )}&facilityId=${encodeURIComponent(selectedFacilityId)}`;

            const editTaskHref =
              alert.scheduling_task_id && selectedOrgId
                ? `/dashboard/scheduling/${encodeURIComponent(
                    alert.scheduling_task_id
                  )}/edit?organizationId=${encodeURIComponent(
                    selectedOrgId
                  )}&facilityId=${encodeURIComponent(selectedFacilityId)}`
                : "";

            return (
              <div
                key={alert.id}
                className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-black/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.25em] text-white ${severityColor(
                          alert.severity
                        )}`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs uppercase tracking-[0.25em] text-black/50 dark:text-white/60">
                        {typeLabel(alert.alert_type)}
                      </span>
                      <span className="text-xs text-black/40 dark:text-white/50">
                        Updated {formatWhen(alert.updated_at)}
                      </span>
                    </div>
                    <div className="mt-2 text-lg font-semibold text-black dark:text-white">
                      {alert.title}
                    </div>
                    <p className="mt-1 text-sm text-black/70 dark:text-white/70">{alert.message}</p>
                  </div>

                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    <Link
                      className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                      href={rescheduleHref}
                    >
                      Reschedule
                    </Link>
                    {editTaskHref ? (
                      <Link
                        className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:border-black/30 dark:border-white/10 dark:text-white/70 dark:hover:border-white/40"
                        href={editTaskHref}
                      >
                        Edit task
                      </Link>
                    ) : null}
                    <form action={resolveAlertAction}>
                      <input type="hidden" name="id" value={alert.id} />
                      <input type="hidden" name="organizationId" value={selectedOrgId} />
                      <input type="hidden" name="facilityId" value={selectedFacilityId} />
                      <button
                        type="submit"
                        className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:border-black/30 dark:border-white/10 dark:text-white/70 dark:hover:border-white/40"
                      >
                        Resolve
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}

          {!alerts.length && !schemaMissing ? (
            <div className="rounded-2xl border border-black/10 bg-white/50 p-6 text-sm text-black/60 dark:border-white/10 dark:bg-black/20 dark:text-white/60">
              Run a scan to populate exception alerts for this facility.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
