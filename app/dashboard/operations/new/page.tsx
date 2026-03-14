import Link from "next/link";
import { redirect } from "next/navigation";
import DateTimeInput from "@/app/components/DateTimeInput";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listFacilities } from "@/lib/services/facilities";
import { listProductionLines } from "@/lib/services/production-lines";
import { listMachines } from "@/lib/services/machines";
import { listWorkers } from "@/lib/services/workers";
import { listWorkOrders } from "@/lib/services/work-orders";
import { listOperations } from "@/lib/services/operations";
import { saveOperationAction } from "../actions";

function formatDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default async function NewOperationPage({
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
    redirect("/login?redirectTo=/dashboard/operations/new");
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

  let machines: Awaited<ReturnType<typeof listMachines>> = [];
  let machinesError = "";
  try {
    machines = selectedProductionLineId
      ? await listMachines(supabase, { productionLineId: selectedProductionLineId })
      : [];
  } catch (e) {
    machinesError = e instanceof Error ? e.message : "Failed to load machines.";
  }

  let workers: Awaited<ReturnType<typeof listWorkers>> = [];
  let workersError = "";
  try {
    workers = selectedFacilityId ? await listWorkers(supabase, { facilityId: selectedFacilityId }) : [];
  } catch (e) {
    workersError = e instanceof Error ? e.message : "Failed to load workers.";
  }

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
    machinesError ||
    workersError ||
    workOrdersError ||
    operationsError;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
            Operations
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create operation</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Define the sequence and resources for this work order.
          </p>
        </div>
        <Link
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
          href={`/dashboard/operations?organizationId=${encodeURIComponent(
            selectedOrgId
          )}&facilityId=${encodeURIComponent(
            selectedFacilityId
          )}&productionLineId=${encodeURIComponent(
            selectedProductionLineId
          )}&workOrderId=${encodeURIComponent(selectedWorkOrderId)}`}
        >
          Back to list
        </Link>
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
            <h2 className="text-base font-semibold">Context</h2>
            <div className="mt-4 space-y-2">
              {organizations.map((o) => {
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
                    href={`/dashboard/operations/new?organizationId=${encodeURIComponent(o.id)}`}
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
              })}
            </div>

            <div className="mt-6 border-t border-black/10 pt-6 dark:border-white/10">
              <div className="grid gap-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
                    Facility
                  </span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                    name="facilityId"
                    defaultValue={selectedFacilityId}
                    disabled
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
                    Production line
                  </span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                    name="productionLineId"
                    defaultValue={selectedProductionLineId}
                    disabled
                  >
                    {productionLines.map((line) => (
                      <option key={line.id} value={line.id}>
                        {line.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/50">
                    Work order
                  </span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                    name="workOrderId"
                    defaultValue={selectedWorkOrderId}
                    disabled
                  >
                    {workOrders.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.products?.name ?? "Product"} · {w.status}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="text-xs text-black/50 dark:text-white/50">
                  Change context in the list page if needed.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
          <h2 className="text-base font-semibold">Operation details</h2>
          <form action={saveOperationAction} className="mt-4 space-y-4">
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="facilityId" value={selectedFacilityId} />
            <input type="hidden" name="productionLineId" value={selectedProductionLineId} />
            <input type="hidden" name="workOrderId" value={selectedWorkOrderId} />

            <label className="block">
              <span className="text-sm font-medium">Name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                name="name"
                placeholder="e.g. CNC Rough Cut"
                disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Sequence</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="sequence"
                  inputMode="numeric"
                  placeholder="1"
                  defaultValue={operations.length + 1}
                  disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Quantity</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="quantity"
                  inputMode="decimal"
                  placeholder="1"
                  defaultValue="1"
                  disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Priority</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="priority"
                  defaultValue="3"
                  disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
                >
                  <option value="1">1 - Highest</option>
                  <option value="2">2 - High</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - Low</option>
                  <option value="5">5 - Lowest</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Status</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="status"
                  defaultValue="pending"
                  disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
                >
                  <option value="pending">Pending</option>
                  <option value="ready">Ready</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Deadline</span>
                <DateTimeInput
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="deadline"
                  defaultValue={formatDateTimeLocal(null)}
                  disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Planned start</span>
                <DateTimeInput
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="plannedStart"
                  defaultValue={formatDateTimeLocal(null)}
                  disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium">Planned end</span>
              <DateTimeInput
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                name="plannedEnd"
                defaultValue={formatDateTimeLocal(null)}
                disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-sm font-medium">Production line</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="productionLineId"
                  defaultValue={selectedProductionLineId}
                  disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
                >
                  <option value="">—</option>
                  {productionLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Machine</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="machineId"
                  defaultValue=""
                  disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
                >
                  <option value="">—</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium">Worker</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="workerId"
                  defaultValue=""
                  disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
                >
                  <option value="">—</option>
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium">Dependencies</span>
              <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-black/30">
                {operations.length ? (
                  operations.map((op) => (
                    <label
                      key={op.id}
                      className="flex items-start gap-2 rounded-xl px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <input type="checkbox" name="dependencyIds" value={op.id} />
                      <span className="min-w-0">
                        <span className="font-medium">{op.name}</span>
                        <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                          seq {op.sequence}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-sm text-black/60 dark:text-white/60">
                    No existing operations for this work order.
                  </div>
                )}
              </div>
            </label>

            <button
              className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
              type="submit"
              disabled={!selectedWorkOrderId || Boolean(anyLoadError)}
            >
              Create operation
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
