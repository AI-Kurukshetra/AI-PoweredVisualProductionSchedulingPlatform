import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listFacilities } from "@/lib/services/facilities";
import { listProductionLines } from "@/lib/services/production-lines";
import { listWorkOrders } from "@/lib/services/work-orders";
import { listOperations } from "@/lib/services/operations";
import { deleteOperationAction } from "./actions";

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";
  const facilityId = typeof sp.facilityId === "string" ? sp.facilityId : "";
  const productionLineId = typeof sp.productionLineId === "string" ? sp.productionLineId : "";
  const workOrderId = typeof sp.workOrderId === "string" ? sp.workOrderId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/operations");
  }

  let organizations: Awaited<ReturnType<typeof listOrganizations>> = [];
  let orgLoadError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    orgLoadError = e instanceof Error ? e.message : "Failed to load organizations.";
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

  let productionLines: Awaited<ReturnType<typeof listProductionLines>> = [];
  let productionLinesError = "";
  try {
    productionLines = selectedFacilityId
      ? await listProductionLines(supabase, { facilityId: selectedFacilityId })
      : [];
  } catch (e) {
    productionLinesError = e instanceof Error ? e.message : "Failed to load production lines.";
  }
  const selectedProductionLineId = productionLineId || productionLines[0]?.id || "";

  let workOrders: Awaited<ReturnType<typeof listWorkOrders>> = [];
  let workOrdersError = "";
  try {
    workOrders = selectedOrgId ? await listWorkOrders(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    workOrdersError = e instanceof Error ? e.message : "Failed to load work orders.";
  }
  const selectedWorkOrderId = workOrderId || workOrders[0]?.id || "";

  let operations: Awaited<ReturnType<typeof listOperations>> = [];
  let operationsError = "";
  try {
    operations = selectedWorkOrderId
      ? await listOperations(supabase, { workOrderId: selectedWorkOrderId })
      : [];
  } catch (e) {
    operationsError = e instanceof Error ? e.message : "Failed to load operations.";
  }

  const anyLoadError =
    orgLoadError ||
    facilitiesError ||
    productionLinesError ||
    workOrdersError ||
    operationsError;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Operations</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Break work orders into step-by-step operations and assign resources.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
            href="/dashboard/work-orders"
          >
            Work orders
          </Link>
          <Link
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            href={`/dashboard/operations/new?organizationId=${encodeURIComponent(
              selectedOrgId
            )}&facilityId=${encodeURIComponent(
              selectedFacilityId
            )}&productionLineId=${encodeURIComponent(
              selectedProductionLineId
            )}&workOrderId=${encodeURIComponent(selectedWorkOrderId)}`}
          >
            Add operation
          </Link>
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      {anyLoadError ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {(anyLoadError as string).includes("schema cache") ? (
            <>
              Database not set up for this Supabase project. In Supabase Dashboard → SQL Editor,
              run `supabase/setup.sql`, then reload the API schema cache (Project Settings → API)
              and refresh this page.
            </>
          ) : (
            anyLoadError
          )}
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
            <h2 className="text-base font-semibold">Organization</h2>
            <div className="mt-4 space-y-2">
              {organizations.length ? (
                organizations.map((o) => {
                  const isSelected = o.id === selectedOrgId;
                  return (
                    <Link
                      key={o.id}
                      className={[
                        "block rounded-2xl border px-4 py-3 text-sm transition-colors",
                        isSelected
                          ? "border-black bg-black text-white ring-2 ring-black/10 dark:border-white/15 dark:ring-white/10"
                          : "border-black/10 bg-white/50 hover:bg-black/5 dark:border-white/10 dark:bg-black/10 dark:hover:bg-white/5",
                      ].join(" ")}
                      href={`/dashboard/operations?organizationId=${encodeURIComponent(o.id)}`}
                      aria-current={isSelected ? "page" : undefined}
                    >
                      <div className="font-medium">{o.name}</div>
                      <div
                        className={[
                          "mt-1 text-xs",
                          isSelected ? "text-white/70" : "text-black/60 dark:text-white/60",
                        ].join(" ")}
                      >
                        {o.description ?? "—"}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-black/10 bg-white/50 px-4 py-4 text-sm text-black/60 dark:border-white/10 dark:bg-black/10 dark:text-white/60">
                  Create an organization first.
                  <div className="mt-3">
                    <Link
                      className="font-medium text-black hover:underline dark:text-white"
                      href="/dashboard/organizations"
                    >
                      Go to Organizations
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-black/10 pt-6 dark:border-white/10">
              <h3 className="text-sm font-semibold">Facility</h3>
              <div className="mt-3 space-y-2">
                {facilities.length ? (
                  facilities.map((f) => {
                    const isSelected = f.id === selectedFacilityId;
                    return (
                      <Link
                        key={f.id}
                        className={[
                          "block rounded-2xl border px-4 py-3 text-sm transition-colors",
                          isSelected
                            ? "border-black bg-black text-white ring-2 ring-black/10 dark:border-white/15 dark:ring-white/10"
                            : "border-black/10 bg-white/50 hover:bg-black/5 dark:border-white/10 dark:bg-black/10 dark:hover:bg-white/5",
                        ].join(" ")}
                        href={`/dashboard/operations?organizationId=${encodeURIComponent(
                          selectedOrgId
                        )}&facilityId=${encodeURIComponent(f.id)}`}
                        aria-current={isSelected ? "page" : undefined}
                      >
                        <div className="font-medium">{f.name}</div>
                        <div
                          className={[
                            "mt-1 text-xs",
                            isSelected ? "text-white/70" : "text-black/60 dark:text-white/60",
                          ].join(" ")}
                        >
                          {f.description ?? "—"}
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-black/10 bg-white/50 px-4 py-4 text-sm text-black/60 dark:border-white/10 dark:bg-black/10 dark:text-white/60">
                    No facilities yet.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 border-t border-black/10 pt-6 dark:border-white/10">
              <h3 className="text-sm font-semibold">Production line</h3>
              <div className="mt-3 space-y-2">
                {productionLines.length ? (
                  productionLines.map((line) => {
                    const isSelected = line.id === selectedProductionLineId;
                    return (
                      <Link
                        key={line.id}
                        className={[
                          "block rounded-2xl border px-4 py-3 text-sm transition-colors",
                          isSelected
                            ? "border-black bg-black text-white ring-2 ring-black/10 dark:border-white/15 dark:ring-white/10"
                            : "border-black/10 bg-white/50 hover:bg-black/5 dark:border-white/10 dark:bg-black/10 dark:hover:bg-white/5",
                        ].join(" ")}
                        href={`/dashboard/operations?organizationId=${encodeURIComponent(
                          selectedOrgId
                        )}&facilityId=${encodeURIComponent(
                          selectedFacilityId
                        )}&productionLineId=${encodeURIComponent(line.id)}`}
                        aria-current={isSelected ? "page" : undefined}
                      >
                        <div className="font-medium">{line.name}</div>
                        <div
                          className={[
                            "mt-1 text-xs",
                            isSelected ? "text-white/70" : "text-black/60 dark:text-white/60",
                          ].join(" ")}
                        >
                          Capacity {line.capacity}
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-black/10 bg-white/50 px-4 py-4 text-sm text-black/60 dark:border-white/10 dark:bg-black/10 dark:text-white/60">
                    No production lines yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
            <h2 className="text-base font-semibold">Work order filter</h2>
            <form className="mt-4 space-y-4" method="get">
              <input type="hidden" name="organizationId" value={selectedOrgId} />
              <input type="hidden" name="facilityId" value={selectedFacilityId} />
              <input type="hidden" name="productionLineId" value={selectedProductionLineId} />

              <label className="block">
                <span className="text-sm font-medium">Work order</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="workOrderId"
                  defaultValue={selectedWorkOrderId}
                  disabled={!selectedOrgId || Boolean(anyLoadError)}
                >
                  {workOrders.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.products?.name ?? "Product"} · {w.status}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                type="submit"
                disabled={!selectedOrgId || !workOrders.length || Boolean(anyLoadError)}
              >
                View operations
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-semibold">Operations</h2>
              <div className="text-sm text-black/60 dark:text-white/60">{operations.length} total</div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Seq</th>
                    <th className="px-4 py-3 font-medium">Qty</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Resources</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/10">
                  {operations.length ? (
                    operations.map((op) => (
                      <tr key={op.id} className="bg-white/50 dark:bg-black/10">
                        <td className="max-w-[18rem] px-4 py-3 font-medium">
                          <div className="truncate">{op.name}</div>
                        </td>
                        <td className="px-4 py-3 text-black/70 dark:text-white/70">{op.sequence}</td>
                        <td className="px-4 py-3 text-black/70 dark:text-white/70">{op.quantity}</td>
                        <td className="px-4 py-3 text-black/70 dark:text-white/70">{op.priority}</td>
                        <td className="px-4 py-3 text-black/70 dark:text-white/70">{op.status}</td>
                        <td className="px-4 py-3 text-black/70 dark:text-white/70">
                          <div className="max-w-[18rem] truncate">
                            {(op.production_lines?.name ?? "—") +
                              " / " +
                              (op.machines?.name ?? "—") +
                              " / " +
                              (op.workers?.name ?? "—")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                              href={`/dashboard/operations/${encodeURIComponent(
                                op.id
                              )}/edit?organizationId=${encodeURIComponent(
                                selectedOrgId
                              )}&facilityId=${encodeURIComponent(
                                selectedFacilityId
                              )}&productionLineId=${encodeURIComponent(
                                selectedProductionLineId
                              )}&workOrderId=${encodeURIComponent(selectedWorkOrderId)}`}
                            >
                              Edit
                            </Link>
                            <form action={deleteOperationAction}>
                              <input type="hidden" name="id" value={op.id} />
                              <input type="hidden" name="organizationId" value={selectedOrgId} />
                              <input type="hidden" name="facilityId" value={selectedFacilityId} />
                              <input
                                type="hidden"
                                name="productionLineId"
                                value={selectedProductionLineId}
                              />
                              <input type="hidden" name="workOrderId" value={selectedWorkOrderId} />
                              <button
                                className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                                type="submit"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        className="px-4 py-10 text-center text-sm text-black/60 dark:text-white/60"
                        colSpan={7}
                      >
                        No operations yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
