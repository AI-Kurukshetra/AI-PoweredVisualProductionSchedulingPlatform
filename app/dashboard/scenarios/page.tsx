import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations, type Organization } from "@/lib/services/organizations";
import { listFacilities, type Facility } from "@/lib/services/facilities";
import { isSchemaCacheMissMessage } from "@/lib/services/supabase-helpers";
import { listScenarios, type Scenario } from "@/lib/services/scenarios";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { createScenarioFromLiveAction, deleteScenarioAction } from "./actions";

export default async function ScenariosPage({
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
    redirect("/login?redirectTo=/dashboard/scenarios");
  }

  let organizations: Organization[] = [];
  let orgError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    orgError = e instanceof Error ? e.message : "Failed to load organizations.";
  }
  const selectedOrgId = organizationId || organizations[0]?.id || "";

  let facilities: Facility[] = [];
  let facilityError = "";
  try {
    facilities = selectedOrgId ? await listFacilities(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    facilityError = e instanceof Error ? e.message : "Failed to load facilities.";
  }
  const selectedFacilityId = facilityId || facilities[0]?.id || "";

  let scenarios: Scenario[] = [];
  let scenariosError = "";
  try {
    scenarios = selectedOrgId
      ? await listScenarios(supabase, {
          organizationId: selectedOrgId,
          facilityId: selectedFacilityId ? selectedFacilityId : undefined,
          limit: 50,
        })
      : [];
  } catch (e) {
    scenariosError = e instanceof Error ? e.message : "Failed to load scenarios.";
  }

  const anyLoadError = orgError || facilityError || scenariosError;
  const schemaMissing = isSchemaCacheMissMessage(anyLoadError) || isSchemaCacheMissMessage(error);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
          Scenario planning
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-black dark:text-white">
          What-if scheduling
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Duplicate the current schedule, adjust tasks, and compare capacity and delivery impact without touching live data.
        </p>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30 md:grid-cols-2"
      >
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
            Organization
          </span>
          <select
            name="organizationId"
            defaultValue={selectedOrgId}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
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
            defaultValue={selectedFacilityId}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
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
          {schemaMissing ? (
            <>
              Scenario tables are not deployed in Supabase yet. Run
              `supabase/migrations/20260316130000_create_scenarios.sql` in Supabase SQL Editor, reload
              the API schema cache, then refresh.
            </>
          ) : (
            anyLoadError
          )}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
          <h2 className="text-xl font-semibold text-black dark:text-white">Create scenario</h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Duplicates scheduled tasks from the live schedule into a new what-if scenario.
          </p>
          <form action={createScenarioFromLiveAction} className="mt-5 grid gap-4">
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="facilityId" value={selectedFacilityId} />

            <label className="block">
              <span className="text-sm font-medium text-black dark:text-white">Name</span>
              <input
                name="name"
                required
                placeholder="e.g. Q2 staffing change"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-black dark:text-white">Description</span>
              <input
                name="description"
                placeholder="Optional context"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-black dark:text-white">Duplicate range</span>
              <select
                name="rangeDays"
                defaultValue="30"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                Uses scheduled tasks whose start time falls in the selected range.
              </p>
            </label>
            <button
              type="submit"
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-white/90"
              disabled={!selectedOrgId || schemaMissing}
            >
              Create scenario from live schedule
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-black dark:text-white">Scenarios</h2>
            <span className="text-sm text-black/60 dark:text-white/60">{scenarios.length} shown</span>
          </div>

          <div className="mt-5 space-y-3">
            {scenarios.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-black dark:text-white">{s.name}</div>
                    <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                      {s.description ?? "—"}
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.25em] text-black/40 dark:text-white/50">
                      {s.status} • updated {new Date(s.updated_at).toISOString().slice(0, 16).replace("T", " ")}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/dashboard/scenarios/${encodeURIComponent(s.id)}`}
                      className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                    >
                      Open
                    </Link>
                    <form id={`delete-scenario-${s.id}`} action={deleteScenarioAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="organizationId" value={selectedOrgId} />
                      <input type="hidden" name="facilityId" value={selectedFacilityId} />
                    </form>
                    <ConfirmDialog
                      trigger={
                        <button
                          type="button"
                          className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:border-black/30 dark:border-white/10 dark:text-white/70 dark:hover:border-white/40"
                        >
                          Delete
                        </button>
                      }
                      title="Delete scenario"
                      description="This will permanently delete the scenario and all its tasks."
                      onConfirm={() => {
                        const form = document.getElementById(
                          `delete-scenario-${s.id}`
                        ) as HTMLFormElement | null;
                        form?.requestSubmit();
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {!scenarios.length && selectedOrgId && !schemaMissing ? (
              <div className="rounded-2xl border border-black/10 bg-white/60 p-6 text-sm text-black/60 dark:border-white/10 dark:bg-black/20 dark:text-white/60">
                No scenarios yet. Create one from the live schedule.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

