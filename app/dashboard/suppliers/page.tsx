import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listSuppliers } from "@/lib/services/suppliers";
import { deleteSupplierAction, saveSupplierAction } from "./actions";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";
  const editId = typeof sp.editId === "string" ? sp.editId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/suppliers");
  }

  let organizations: Awaited<ReturnType<typeof listOrganizations>> = [];
  let loadError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load organizations.";
  }

  const selectedOrgId = organizationId || organizations[0]?.id || "";

  let suppliers: Awaited<ReturnType<typeof listSuppliers>> = [];
  let suppliersError = "";
  try {
    suppliers = selectedOrgId ? await listSuppliers(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    suppliersError = e instanceof Error ? e.message : "Failed to load suppliers.";
  }

  const supplierToEdit = editId ? suppliers.find((s) => s.id === editId) : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Suppliers</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Maintain supplier contacts for inventory receipts.
          </p>
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

      {loadError || suppliersError ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {(loadError + " " + suppliersError).includes("schema cache") ? (
            <>
              Database not set up for this Supabase project. In Supabase Dashboard → SQL Editor,
              run `supabase/setup.sql`, then reload the API schema cache (Project Settings → API)
              and refresh this page.
            </>
          ) : (
            (loadError || suppliersError)
          )}
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <h2 className="text-base font-semibold">Organization</h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Suppliers belong to an organization.
          </p>

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
                    href={`/dashboard/suppliers?organizationId=${encodeURIComponent(o.id)}`}
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
                No organizations yet. Create one first.
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
            <h3 className="text-sm font-semibold">
              {supplierToEdit ? "Edit supplier" : "Create supplier"}
            </h3>

            <form action={saveSupplierAction} className="mt-3 space-y-4">
              <input type="hidden" name="id" value={supplierToEdit?.id ?? ""} />
              <input type="hidden" name="organizationId" value={selectedOrgId} />

              <label className="block">
                <span className="text-sm font-medium">Name</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="name"
                  required
                  placeholder="e.g. SteelCo Traders"
                  disabled={Boolean(loadError) || Boolean(suppliersError)}
                  defaultValue={supplierToEdit?.name ?? ""}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Contact</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="contact"
                  placeholder="Phone, email, address (optional)"
                  disabled={Boolean(loadError) || Boolean(suppliersError)}
                  defaultValue={supplierToEdit?.contact ?? ""}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Notes</span>
                <textarea
                  className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="notes"
                  rows={3}
                  placeholder="Optional"
                  disabled={Boolean(loadError) || Boolean(suppliersError)}
                  defaultValue={supplierToEdit?.notes ?? ""}
                />
              </label>

              <div className="flex items-center gap-2">
                {supplierToEdit ? (
                  <Link
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
                    href={`/dashboard/suppliers?organizationId=${encodeURIComponent(selectedOrgId)}`}
                  >
                    Cancel
                  </Link>
                ) : null}
                <button
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                  type="submit"
                  disabled={!selectedOrgId || Boolean(loadError) || Boolean(suppliersError)}
                >
                  {supplierToEdit ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">All suppliers</h2>
            <div className="text-sm text-black/60 dark:text-white/60">{suppliers.length} total</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {suppliers.length ? (
                  suppliers.map((s) => (
                    <tr key={s.id} className="bg-white/50 dark:bg-black/10">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="max-w-[18rem] px-4 py-3 text-black/60 dark:text-white/60">
                        <div className="truncate" title={s.contact ?? ""}>
                          {s.contact ?? "—"}
                        </div>
                      </td>
                      <td className="max-w-[22rem] px-4 py-3 text-black/60 dark:text-white/60">
                        <div className="truncate" title={s.notes ?? ""}>
                          {s.notes ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                            href={`/dashboard/suppliers?organizationId=${encodeURIComponent(
                              selectedOrgId
                            )}&editId=${encodeURIComponent(s.id)}`}
                          >
                            Edit
                          </Link>
                          <form action={deleteSupplierAction}>
                            <input type="hidden" name="id" value={s.id} />
                            <input type="hidden" name="organizationId" value={selectedOrgId} />
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
                      colSpan={4}
                    >
                      No suppliers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-sm text-black/60 dark:text-white/60">
            Use suppliers in <Link className="underline" href="/dashboard/inventory">Inventory</Link> receipts.
          </div>
        </div>
      </div>
    </div>
  );
}

