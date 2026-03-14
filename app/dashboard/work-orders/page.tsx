import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listWorkOrders } from "@/lib/services/work-orders";
import WorkOrdersPanel from "./WorkOrdersPanel";

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/work-orders");
  }

  let organizations: Awaited<ReturnType<typeof listOrganizations>> = [];
  let orgLoadError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    orgLoadError = e instanceof Error ? e.message : "Failed to load organizations.";
  }

  const selectedOrgId = organizationId || organizations[0]?.id || "";

  let workOrders: Awaited<ReturnType<typeof listWorkOrders>> = [];
  let workOrdersError = "";
  try {
    workOrders = selectedOrgId ? await listWorkOrders(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    workOrdersError = e instanceof Error ? e.message : "Failed to load work orders.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">Work orders</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Create production work orders with priorities, deadlines, and dependencies.
          </p>
        </div>
        <Link
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
          href="/dashboard/operations"
        >
          Operations
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {orgLoadError || workOrdersError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {(orgLoadError + " " + workOrdersError).includes("schema cache") ? (
            <>
              Database not set up for this Supabase project. In Supabase Dashboard → SQL Editor,
              run `supabase/setup.sql`, then reload the API schema cache (Project Settings → API)
              and refresh this page.
            </>
          ) : (
            (orgLoadError || workOrdersError)
          )}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="grid gap-3 pb-4 sm:grid-cols-2 md:grid-cols-3">
          {organizations.map((org) => {
            const isSelected = org.id === selectedOrgId;
            return (
              <Link
                key={org.id}
                className={`rounded-2xl border px-4 py-3 text-sm transition ${
                  isSelected
                    ? "border-black bg-black text-white"
                    : "border-black/10 bg-white/70 text-black hover:border-black/30 dark:border-white/10 dark:bg-black/10 dark:text-white/80 dark:hover:border-white/40"
                }`}
                href={`/dashboard/work-orders?organizationId=${encodeURIComponent(org.id)}`}
              >
                <div className="font-medium">{org.name}</div>
                <div className="text-xs text-black/50 dark:text-white/50">{org.description ?? "—"}</div>
              </Link>
            );
          })}
        </div>

        <WorkOrdersPanel
          workOrders={workOrders}
          organizationId={selectedOrgId}
          initialMessage={message}
          initialError={error}
        />
      </div>
    </div>
  );
}
