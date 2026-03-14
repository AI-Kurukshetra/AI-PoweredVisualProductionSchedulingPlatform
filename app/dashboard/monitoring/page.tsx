import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations, type Organization } from "@/lib/services/organizations";
import { getMonitoringData } from "@/lib/services/monitoring";
import MonitoringDashboard from "./MonitoringDashboard";

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/monitoring");
  }

  let organizations: Organization[] = [];
  let loadError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load organizations.";
  }

  const selectedOrgId = (organizationId || organizations[0]?.id) ?? "";
  let initialData: Awaited<ReturnType<typeof getMonitoringData>> | null = null;
  if (selectedOrgId) {
    try {
      initialData = await getMonitoringData(supabase, { organizationId: selectedOrgId });
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Failed to load monitoring data.";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
            Production monitoring
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-black dark:text-white">
            Real-time production dashboard
          </h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Active work orders, machine utilization, worker activity, schedule progress, and delays.
            Updates live via Supabase Realtime.
          </p>
        </div>
      </div>

      <form className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-black/30" method="get">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-black/50 dark:text-white/60">
            Organization
          </span>
          <select
            name="organizationId"
            defaultValue={selectedOrgId}
            className="mt-2 w-full max-w-xs rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
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
        <button
          type="submit"
          className="mt-3 rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          Load dashboard
        </button>
      </form>

      {loadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {loadError}
        </div>
      ) : null}

      {selectedOrgId && initialData ? (
        <MonitoringDashboard
          organizationId={selectedOrgId}
          initialData={initialData}
        />
      ) : selectedOrgId && !initialData ? (
        <div className="rounded-2xl border border-black/10 bg-white/80 p-6 text-sm text-black/60 dark:border-white/10 dark:bg-black/30 dark:text-white/60">
          No data for this organization.
        </div>
      ) : null}
    </div>
  );
}
