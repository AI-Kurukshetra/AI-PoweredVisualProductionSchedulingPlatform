import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listProducts } from "@/lib/services/products";
import { listMaterials } from "@/lib/services/materials";
import { listBom } from "@/lib/services/bom";
import {
  deleteBomItemAction,
  deleteMaterialAction,
  saveBomItemAction,
  saveMaterialAction,
} from "./actions";

export default async function BomPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";
  const productId = typeof sp.productId === "string" ? sp.productId : "";
  const editMaterialId = typeof sp.editMaterialId === "string" ? sp.editMaterialId : "";
  const editBomId = typeof sp.editBomId === "string" ? sp.editBomId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/bom");
  }

  let organizations: Awaited<ReturnType<typeof listOrganizations>> = [];
  let orgLoadError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    orgLoadError = e instanceof Error ? e.message : "Failed to load organizations.";
  }

  const selectedOrgId = organizationId || organizations[0]?.id || "";

  let products: Awaited<ReturnType<typeof listProducts>> = [];
  let productsLoadError = "";
  try {
    products = selectedOrgId ? await listProducts(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    productsLoadError = e instanceof Error ? e.message : "Failed to load products.";
  }

  const selectedProductId = productId || products[0]?.id || "";

  let materials: Awaited<ReturnType<typeof listMaterials>> = [];
  let materialsLoadError = "";
  try {
    materials = selectedOrgId ? await listMaterials(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    materialsLoadError = e instanceof Error ? e.message : "Failed to load materials.";
  }

  let bomItems: Awaited<ReturnType<typeof listBom>> = [];
  let bomLoadError = "";
  try {
    bomItems = selectedProductId ? await listBom(supabase, { productId: selectedProductId }) : [];
  } catch (e) {
    bomLoadError = e instanceof Error ? e.message : "Failed to load BOM items.";
  }

  const materialToEdit = editMaterialId ? materials.find((m) => m.id === editMaterialId) : undefined;
  const bomToEdit = editBomId ? bomItems.find((b) => b.id === editBomId) : undefined;

  const anyLoadError = orgLoadError || productsLoadError || materialsLoadError || bomLoadError;
  const selectedProductName = products.find((p) => p.id === selectedProductId)?.name ?? "";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">BOM</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Link products and materials (quantity + unit) per organization.
          </p>
        </div>
        <Link
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
          href="/dashboard/products"
        >
          Products
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

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
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
                    href={`/dashboard/bom?organizationId=${encodeURIComponent(o.id)}`}
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
                  <Link className="font-medium text-black hover:underline dark:text-white" href="/dashboard/organizations">
                    Go to Organizations
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-black/10 pt-6 dark:border-white/10">
            <h3 className="text-sm font-semibold">Product</h3>
            <div className="mt-3 space-y-2">
              {products.length ? (
                products.map((p) => {
                  const isSelected = p.id === selectedProductId;
                  return (
                    <Link
                      key={p.id}
                      className={[
                        "block rounded-2xl border px-4 py-3 text-sm transition-colors",
                        isSelected
                          ? "border-black bg-black text-white ring-2 ring-black/10 dark:border-white/15 dark:ring-white/10"
                          : "border-black/10 bg-white/50 hover:bg-black/5 dark:border-white/10 dark:bg-black/10 dark:hover:bg-white/5",
                      ].join(" ")}
                      href={`/dashboard/bom?organizationId=${encodeURIComponent(
                        selectedOrgId
                      )}&productId=${encodeURIComponent(p.id)}`}
                      aria-current={isSelected ? "page" : undefined}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div
                        className={[
                          "mt-1 text-xs",
                          isSelected ? "text-white/70" : "text-black/60 dark:text-white/60",
                        ].join(" ")}
                      >
                        SKU: {p.sku ?? "—"}
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-black/10 bg-white/50 px-4 py-4 text-sm text-black/60 dark:border-white/10 dark:bg-black/10 dark:text-white/60">
                  Select an organization and create a product first.
                  <div className="mt-3">
                    <Link
                      className="font-medium text-black hover:underline dark:text-white"
                      href={`/dashboard/products?organizationId=${encodeURIComponent(selectedOrgId)}`}
                    >
                      Go to Products
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-black/10 pt-6 dark:border-white/10">
            <h3 className="text-sm font-semibold">
              {materialToEdit ? "Edit material" : "Add material"}
            </h3>
            <form action={saveMaterialAction} className="mt-3 space-y-4">
              <input type="hidden" name="id" value={materialToEdit?.id ?? ""} />
              <input type="hidden" name="organizationId" value={selectedOrgId} />

              <label className="block">
                <span className="text-sm font-medium">Name</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="name"
                  required
                  placeholder="e.g. Steel rod"
                  defaultValue={materialToEdit?.name ?? ""}
                  disabled={Boolean(anyLoadError)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Code</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="code"
                  placeholder="Optional"
                  defaultValue={materialToEdit?.code ?? ""}
                  disabled={Boolean(anyLoadError)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="description"
                  rows={3}
                  placeholder="Optional"
                  defaultValue={materialToEdit?.description ?? ""}
                  disabled={Boolean(anyLoadError)}
                />
              </label>

              <div className="flex items-center gap-2">
                {materialToEdit ? (
                  <Link
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
                    href={`/dashboard/bom?organizationId=${encodeURIComponent(selectedOrgId)}${
                      selectedProductId ? `&productId=${encodeURIComponent(selectedProductId)}` : ""
                    }`}
                  >
                    Cancel
                  </Link>
                ) : null}
                <button
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                  type="submit"
                  disabled={!selectedOrgId || Boolean(anyLoadError)}
                >
                  {materialToEdit ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Bill of materials</h2>
              <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                {selectedProductName ? `Product: ${selectedProductName}` : "Select a product"}
              </div>
            </div>
            <div className="text-sm text-black/60 dark:text-white/60">{bomItems.length} items</div>
          </div>

          <div className="mt-6 rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-black/10">
            <h3 className="text-sm font-semibold">{bomToEdit ? "Edit BOM item" : "Add BOM item"}</h3>
            <form action={saveBomItemAction} className="mt-4 space-y-4">
              <input type="hidden" name="id" value={bomToEdit?.id ?? ""} />
              <input type="hidden" name="organizationId" value={selectedOrgId} />
              <input type="hidden" name="productId" value={selectedProductId} />

              <label className="block">
                <span className="text-sm font-medium">Material</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="materialId"
                  required
                  disabled={!selectedProductId || Boolean(anyLoadError) || Boolean(bomToEdit)}
                  defaultValue={bomToEdit?.material_id ?? ""}
                >
                  <option value="" disabled>
                    Select material
                  </option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.code ? ` (${m.code})` : ""}
                    </option>
                  ))}
                </select>
                {bomToEdit ? (
                  <div className="mt-2 text-xs text-black/55 dark:text-white/55">
                    Material cannot be changed while editing (delete and re-add to change).
                  </div>
                ) : null}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium">Quantity</span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                    name="quantity"
                    type="number"
                    min={0}
                    step="0.0001"
                    required
                    placeholder="0"
                    defaultValue={bomToEdit ? Number(bomToEdit.quantity) : ""}
                    disabled={!selectedProductId || Boolean(anyLoadError)}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Unit</span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-50 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                    name="unit"
                    required
                    placeholder="e.g. kg, pcs, m"
                    defaultValue={bomToEdit?.unit ?? ""}
                    disabled={!selectedProductId || Boolean(anyLoadError)}
                  />
                </label>
              </div>

              <div className="flex items-center gap-2">
                {bomToEdit ? (
                  <Link
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
                    href={`/dashboard/bom?organizationId=${encodeURIComponent(
                      selectedOrgId
                    )}&productId=${encodeURIComponent(selectedProductId)}`}
                  >
                    Cancel
                  </Link>
                ) : null}
                <button
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                  type="submit"
                  disabled={!selectedProductId || Boolean(anyLoadError)}
                >
                  {bomToEdit ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {bomItems.length ? (
                  bomItems.map((b) => (
                    <tr key={b.id} className="bg-white/50 dark:bg-black/10">
                      <td className="px-4 py-3 font-medium">
                        {b.materials?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">
                        {b.quantity}
                      </td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">
                        {b.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                            href={`/dashboard/bom?organizationId=${encodeURIComponent(
                              selectedOrgId
                            )}&productId=${encodeURIComponent(
                              selectedProductId
                            )}&editBomId=${encodeURIComponent(b.id)}`}
                          >
                            Edit
                          </Link>
                          <form action={deleteBomItemAction}>
                            <input type="hidden" name="id" value={b.id} />
                            <input type="hidden" name="organizationId" value={selectedOrgId} />
                            <input type="hidden" name="productId" value={selectedProductId} />
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
                      {selectedProductId ? "No BOM items yet." : "Select a product first."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 border-t border-black/10 pt-6 dark:border-white/10">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold">Materials</h3>
              <div className="text-sm text-black/60 dark:text-white/60">{materials.length} total</div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/10">
                  {materials.length ? (
                    materials.map((m) => (
                      <tr key={m.id} className="bg-white/50 dark:bg-black/10">
                        <td className="px-4 py-3 font-medium">{m.name}</td>
                        <td className="px-4 py-3 text-black/60 dark:text-white/60">{m.code ?? "—"}</td>
                        <td
                          className="max-w-[20rem] px-4 py-3 text-black/60 dark:text-white/60"
                          title={m.description ?? ""}
                        >
                          <div className="truncate">{m.description ?? "—"}</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                              href={`/dashboard/bom?organizationId=${encodeURIComponent(
                                selectedOrgId
                              )}${selectedProductId ? `&productId=${encodeURIComponent(selectedProductId)}` : ""}&editMaterialId=${encodeURIComponent(
                                m.id
                              )}`}
                            >
                              Edit
                            </Link>
                            <form action={deleteMaterialAction}>
                              <input type="hidden" name="id" value={m.id} />
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
                        {selectedOrgId ? "No materials yet." : "Select an organization first."}
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

