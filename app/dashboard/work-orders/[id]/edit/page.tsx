import Link from "next/link";
import { redirect } from "next/navigation";
import DateTimeInput from "@/app/components/DateTimeInput";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listProducts } from "@/lib/services/products";
import { listWorkOrders } from "@/lib/services/work-orders";
import { saveWorkOrderAction } from "../../actions";

function formatDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default async function EditWorkOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { id } = await params;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/dashboard/work-orders/${id}/edit`);
  }

  let organizations: Awaited<ReturnType<typeof listOrganizations>> = [];
  let orgLoadError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    orgLoadError = e instanceof Error ? e.message : "Failed to load organizations.";
  }

  let workOrders: Awaited<ReturnType<typeof listWorkOrders>> = [];
  let workOrdersError = "";
  try {
    workOrders = organizationId ? await listWorkOrders(supabase, { organizationId }) : [];
  } catch (e) {
    workOrdersError = e instanceof Error ? e.message : "Failed to load work orders.";
  }

  const workOrder = workOrders.find((w) => w.id === id);
  const selectedOrgId = organizationId || workOrder?.organization_id || organizations[0]?.id || "";

  let products: Awaited<ReturnType<typeof listProducts>> = [];
  let productsError = "";
  try {
    products = selectedOrgId ? await listProducts(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    productsError = e instanceof Error ? e.message : "Failed to load products.";
  }

  const anyLoadError = orgLoadError || productsError || workOrdersError;

  if (!workOrder && !anyLoadError) {
    redirect(`/dashboard/work-orders?organizationId=${encodeURIComponent(selectedOrgId)}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
            Work orders
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Edit work order</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Adjust the priority, deadline, or dependencies before scheduling.
          </p>
        </div>
        <Link
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
          href={`/dashboard/work-orders?organizationId=${encodeURIComponent(selectedOrgId)}`}
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

      <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.6fr]">
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
          <h2 className="text-base font-semibold">Organization</h2>
          <div className="mt-4 space-y-2">
            {organizations.length ? (
              organizations.map((o) => {
                const isSelected = o.id === selectedOrgId;
                return (
                  <div
                    key={o.id}
                    className={[
                      "block rounded-2xl border px-4 py-3 text-sm",
                      isSelected
                        ? "border-black bg-black text-white"
                        : "border-black/10 bg-white/50 text-black/60 dark:border-white/10 dark:bg-black/10 dark:text-white/60",
                    ].join(" ")}
                  >
                    <div className="font-medium">{o.name}</div>
                    <div className="mt-1 text-xs">{o.description ?? "—"}</div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-black/10 bg-white/50 px-4 py-4 text-sm text-black/60 dark:border-white/10 dark:bg-black/10 dark:text-white/60">
                Create an organization first.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
          <h2 className="text-base font-semibold">Work order details</h2>
          <form action={saveWorkOrderAction} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={workOrder?.id ?? ""} />
            <input type="hidden" name="organizationId" value={selectedOrgId} />

            <label className="block">
              <span className="text-sm font-medium">Product</span>
              <select
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                name="productId"
                defaultValue={workOrder?.product_id ?? products[0]?.id ?? ""}
                disabled={!selectedOrgId || Boolean(anyLoadError)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.sku ? ` (${p.sku})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Quantity</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="quantity"
                  inputMode="decimal"
                  defaultValue={workOrder?.quantity ?? "1"}
                  disabled={Boolean(anyLoadError)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Priority</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="priority"
                  defaultValue={String(workOrder?.priority ?? 3)}
                  disabled={Boolean(anyLoadError)}
                >
                  <option value="1">1 - Highest</option>
                  <option value="2">2 - High</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - Low</option>
                  <option value="5">5 - Lowest</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Deadline</span>
                <DateTimeInput
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="deadline"
                  defaultValue={formatDateTimeLocal(workOrder?.deadline ?? null)}
                  disabled={Boolean(anyLoadError)}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Status</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="status"
                  defaultValue={workOrder?.status ?? "planned"}
                  disabled={Boolean(anyLoadError)}
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium">Dependencies</span>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-black/30">
                {workOrders.length ? (
                  workOrders.map((w) => {
                    const isSelf = w.id === workOrder?.id;
                    const isChecked = workOrder?.dependency_ids?.includes(w.id);
                    return (
                      <label
                        key={w.id}
                        className={[
                          "flex items-start gap-2 rounded-xl px-2 py-2",
                          isSelf ? "opacity-40" : "hover:bg-black/5 dark:hover:bg-white/5",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          name="dependencyIds"
                          value={w.id}
                          defaultChecked={isChecked}
                          disabled={Boolean(isSelf) || Boolean(anyLoadError)}
                        />
                        <span className="min-w-0">
                          <span className="font-medium">{w.products?.name ?? "Product"}</span>
                          <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                            {w.status}
                          </span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <div className="text-sm text-black/60 dark:text-white/60">
                    No existing work orders.
                  </div>
                )}
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Notes</span>
              <textarea
                className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                name="notes"
                rows={3}
                defaultValue={workOrder?.notes ?? ""}
                disabled={Boolean(anyLoadError)}
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                type="submit"
                disabled={!selectedOrgId || Boolean(anyLoadError)}
              >
                Update work order
              </button>
              <Link
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
                href={`/dashboard/work-orders?organizationId=${encodeURIComponent(selectedOrgId)}`}
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

