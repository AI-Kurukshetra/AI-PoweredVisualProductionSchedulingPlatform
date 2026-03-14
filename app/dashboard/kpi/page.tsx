import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations, type Organization } from "@/lib/services/organizations";
import { listFacilities, type Facility } from "@/lib/services/facilities";
import { getKpiDashboardData } from "@/lib/services/kpis";
import KpiDashboard from "./KpiDashboard";

function parseRangeDays(raw: string) {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90) return n;
  return 30;
}

export default async function KpiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";
  const facilityId = typeof sp.facilityId === "string" ? sp.facilityId : "";
  const rangeRaw = typeof sp.range === "string" ? sp.range : "30";
  const rangeDays = parseRangeDays(rangeRaw);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/kpi");
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

  let data: Awaited<ReturnType<typeof getKpiDashboardData>> | null = null;
  let dataError = "";
  if (selectedOrgId) {
    try {
      data = await getKpiDashboardData(supabase, {
        organizationId: selectedOrgId,
        facilityId: selectedFacilityId ? selectedFacilityId : undefined,
        rangeDays,
      });
    } catch (e) {
      dataError = e instanceof Error ? e.message : "Failed to load KPI data.";
    }
  }

  const anyLoadError = error || orgError || facilityError || dataError;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
          Custom KPI dashboard
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-black dark:text-white">
          OEE, utilization, delivery, throughput
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Aggregates data from schedules, machines, and work orders into executive KPIs.
        </p>
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30 md:grid-cols-3"
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

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
            Range
          </span>
          <select
            name="range"
            defaultValue={String(rangeDays)}
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>

        <div className="md:col-span-3">
          <button
            type="submit"
            className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Load KPIs
          </button>
        </div>
      </form>

      {anyLoadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {(anyLoadError as string).includes("schema cache") ? (
            <>
              Database not set up for this Supabase project. Run `supabase/setup.sql` in Supabase SQL
              Editor, reload the API schema cache, then refresh.
            </>
          ) : (
            anyLoadError
          )}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      {selectedOrgId && data ? (
        <KpiDashboard data={data} />
      ) : selectedOrgId && !data && !anyLoadError ? (
        <div className="rounded-2xl border border-black/10 bg-white/80 p-6 text-sm text-black/60 dark:border-white/10 dark:bg-black/30 dark:text-white/60">
          No KPI data for this selection.
        </div>
      ) : null}
    </div>
  );
}

