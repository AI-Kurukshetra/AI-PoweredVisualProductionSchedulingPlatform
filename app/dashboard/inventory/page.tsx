import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listFacilities } from "@/lib/services/facilities";
import { listMaterials } from "@/lib/services/materials";
import { listProducts } from "@/lib/services/products";
import { listBom } from "@/lib/services/bom";
import { listSuppliers } from "@/lib/services/suppliers";
import { listInventoryStock, listMaterialTransactions } from "@/lib/services/inventory";
import { applyMaterialTransactionAction, saveStockSettingsAction } from "./actions";
import InventoryPanel, { InventoryTransactionsPanel } from "./InventoryPanel";

function n(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";
  const facilityId = typeof sp.facilityId === "string" ? sp.facilityId : "";
  const productId = typeof sp.productId === "string" ? sp.productId : "";
  const plannedQtyRaw = typeof sp.plannedQty === "string" ? sp.plannedQty : "";
  const plannedQty = plannedQtyRaw ? Math.max(0, n(plannedQtyRaw)) : 0;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/inventory");
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

  let materials: Awaited<ReturnType<typeof listMaterials>> = [];
  let materialsError = "";
  try {
    materials = selectedOrgId ? await listMaterials(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    materialsError = e instanceof Error ? e.message : "Failed to load materials.";
  }

  let suppliers: Awaited<ReturnType<typeof listSuppliers>> = [];
  let suppliersError = "";
  try {
    suppliers = selectedOrgId ? await listSuppliers(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    suppliersError = e instanceof Error ? e.message : "Failed to load suppliers.";
  }

  let products: Awaited<ReturnType<typeof listProducts>> = [];
  let productsError = "";
  try {
    products = selectedOrgId ? await listProducts(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    productsError = e instanceof Error ? e.message : "Failed to load products.";
  }

  const selectedProductId = productId || products[0]?.id || "";

  let stock: Awaited<ReturnType<typeof listInventoryStock>> = [];
  let stockError = "";
  try {
    stock = selectedFacilityId ? await listInventoryStock(supabase, { facilityId: selectedFacilityId }) : [];
  } catch (e) {
    stockError = e instanceof Error ? e.message : "Failed to load inventory stock.";
  }

  let transactions: Awaited<ReturnType<typeof listMaterialTransactions>> = [];
  let txnError = "";
  try {
    transactions = selectedFacilityId
      ? await listMaterialTransactions(supabase, { facilityId: selectedFacilityId, limit: 25 })
      : [];
  } catch (e) {
    txnError = e instanceof Error ? e.message : "Failed to load transactions.";
  }

  let bomItems: Awaited<ReturnType<typeof listBom>> = [];
  let bomError = "";
  try {
    bomItems = selectedProductId ? await listBom(supabase, { productId: selectedProductId }) : [];
  } catch (e) {
    bomError = e instanceof Error ? e.message : "Failed to load BOM.";
  }

  const anyLoadError =
    orgLoadError ||
    facilitiesError ||
    materialsError ||
    suppliersError ||
    productsError ||
    stockError ||
    txnError ||
    bomError;

  const stockByMaterialId = new Map(
    stock.map((s) => [
      s.material_id,
      {
        onHand: n(s.on_hand),
        reserved: n(s.reserved),
        reorderPoint: n(s.reorder_point),
        unit: s.unit,
        materialName: s.materials?.name ?? "",
      },
    ])
  );

  const shortageRows =
    selectedProductId && plannedQty > 0
      ? bomItems.map((b) => {
          const required = n(b.quantity) * plannedQty;
          const stockRow = stockByMaterialId.get(b.material_id);
          const available = stockRow ? Math.max(stockRow.onHand - stockRow.reserved, 0) : 0;
          const shortage = Math.max(required - available, 0);
          return {
            id: b.id,
            materialId: b.material_id,
            materialName: b.materials?.name ?? "Material",
            materialCode: b.materials?.code ?? "",
            required,
            unit: b.unit,
            available,
            shortage,
          };
        })
      : [];

  const lowStockRows = stock
    .map((s) => {
      const onHand = n(s.on_hand);
      const reserved = n(s.reserved);
      const reorderPoint = n(s.reorder_point);
      const available = Math.max(onHand - reserved, 0);
      return { s, onHand, reserved, reorderPoint, available, isLow: reorderPoint > 0 && available <= reorderPoint };
    })
    .filter((x) => x.isLow);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Track material stock by facility and detect shortages using BOM.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
            href="/dashboard/bom"
          >
            Materials & BOM
          </Link>
          <Link
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
            href="/dashboard/suppliers"
          >
            Suppliers
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
          <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
            <h2 className="text-base font-semibold">Organization</h2>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              Choose an organization, then pick a facility.
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
                      href={`/dashboard/inventory?organizationId=${encodeURIComponent(o.id)}`}
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
                  No organizations yet.
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
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Inventory is tracked per facility.
              </p>

              <div className="mt-4 space-y-2">
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
                        href={`/dashboard/inventory?organizationId=${encodeURIComponent(
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
                    <div className="mt-3">
                      <Link
                        className="font-medium text-black hover:underline dark:text-white"
                        href={`/dashboard/facilities?organizationId=${encodeURIComponent(selectedOrgId)}`}
                      >
                        Go to Facilities
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
            <h2 className="text-base font-semibold">Shortage check</h2>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              Pick a product and planned quantity to compare BOM requirements vs available stock.
            </p>

            <form className="mt-4 space-y-4" method="get">
              <input type="hidden" name="organizationId" value={selectedOrgId} />
              <input type="hidden" name="facilityId" value={selectedFacilityId} />

              <label className="block">
                <span className="text-sm font-medium">Product</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                  name="productId"
                  defaultValue={selectedProductId}
                  disabled={!selectedFacilityId || Boolean(anyLoadError)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Planned quantity</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="plannedQty"
                  placeholder="e.g. 100"
                  inputMode="decimal"
                  defaultValue={plannedQtyRaw || ""}
                  disabled={!selectedFacilityId || Boolean(anyLoadError)}
                />
              </label>

              <button
                className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                type="submit"
                disabled={!selectedFacilityId || !products.length || Boolean(anyLoadError)}
              >
                Check shortages
              </button>
            </form>

            {selectedProductId && plannedQty > 0 ? (
              <div className="mt-6">
                {shortageRows.some((r) => r.shortage > 0) ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                    Shortages detected for this plan.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                    No shortages detected for this plan.
                  </div>
                )}

                <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
                      <tr>
                        <th className="px-4 py-3 font-medium">Material</th>
                        <th className="px-4 py-3 font-medium">Required</th>
                        <th className="px-4 py-3 font-medium">Available</th>
                        <th className="px-4 py-3 font-medium">Shortage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/10 dark:divide-white/10">
                      {shortageRows.length ? (
                        shortageRows.map((r) => (
                          <tr key={r.id} className="bg-white/50 dark:bg-black/10">
                            <td className="px-4 py-3 font-medium">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate">
                                    {r.materialName}
                                    {r.materialCode ? (
                                      <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                                        {r.materialCode}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-black/70 dark:text-white/70">
                              {r.required.toFixed(4)} {r.unit}
                            </td>
                            <td className="px-4 py-3 text-black/70 dark:text-white/70">
                              {r.available.toFixed(4)}
                            </td>
                            <td
                              className={[
                                "px-4 py-3 font-medium",
                                r.shortage > 0
                                  ? "text-red-700 dark:text-red-200"
                                  : "text-emerald-800 dark:text-emerald-200",
                              ].join(" ")}
                            >
                              {r.shortage.toFixed(4)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            className="px-4 py-8 text-center text-sm text-black/60 dark:text-white/60"
                            colSpan={4}
                          >
                            No BOM items for this product.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          {lowStockRows.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
              {lowStockRows.length} low stock alert{lowStockRows.length === 1 ? "" : "s"} for the
              selected facility.
            </div>
          ) : null}

          <InventoryPanel stock={stock} transactions={transactions} />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
              <h2 className="text-base font-semibold">Stock settings</h2>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Set reorder point / reserved values for a material in this facility.
              </p>

              <form action={saveStockSettingsAction} className="mt-4 space-y-4">
                <input type="hidden" name="organizationId" value={selectedOrgId} />
                <input type="hidden" name="facilityId" value={selectedFacilityId} />

                <label className="block">
                  <span className="text-sm font-medium">Material</span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                    name="materialId"
                    disabled={!selectedFacilityId || Boolean(anyLoadError)}
                    defaultValue={materials[0]?.id ?? ""}
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.code ? ` (${m.code})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Reorder point</span>
                    <input
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                      name="reorderPoint"
                      placeholder="0"
                      inputMode="decimal"
                      disabled={!selectedFacilityId || !materials.length || Boolean(anyLoadError)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Reserved</span>
                    <input
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                      name="reserved"
                      placeholder="0"
                      inputMode="decimal"
                      disabled={!selectedFacilityId || !materials.length || Boolean(anyLoadError)}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium">Unit</span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                    name="unit"
                    placeholder="e.g. kg, pcs"
                    disabled={!selectedFacilityId || !materials.length || Boolean(anyLoadError)}
                    defaultValue="unit"
                  />
                </label>

                <button
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                  type="submit"
                  disabled={!selectedFacilityId || !materials.length || Boolean(anyLoadError)}
                >
                  Save settings
                </button>

                {!materials.length ? (
                  <div className="text-sm text-black/60 dark:text-white/60">
                    No materials found. Add materials in{" "}
                    <Link className="underline" href="/dashboard/bom">
                      BOM
                    </Link>
                    .
                  </div>
                ) : null}
              </form>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
              <h2 className="text-base font-semibold">Material transaction</h2>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Receipt increases stock, issue reduces stock, adjustment can be +/−.
              </p>

              <form action={applyMaterialTransactionAction} className="mt-4 space-y-4">
                <input type="hidden" name="organizationId" value={selectedOrgId} />
                <input type="hidden" name="facilityId" value={selectedFacilityId} />

                <label className="block">
                  <span className="text-sm font-medium">Material</span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                    name="materialId"
                    disabled={!selectedFacilityId || Boolean(anyLoadError)}
                    defaultValue={materials[0]?.id ?? ""}
                  >
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.code ? ` (${m.code})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Type</span>
                    <select
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                      name="txnType"
                      defaultValue="receipt"
                      disabled={!selectedFacilityId || Boolean(anyLoadError)}
                    >
                      <option value="receipt">Receipt (+)</option>
                      <option value="issue">Issue (−)</option>
                      <option value="adjustment">Adjustment (+/−)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Quantity</span>
                    <input
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                      name="quantity"
                      placeholder="0"
                      inputMode="decimal"
                      disabled={!selectedFacilityId || !materials.length || Boolean(anyLoadError)}
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium">Unit</span>
                    <input
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                      name="unit"
                      placeholder="e.g. kg, pcs"
                      defaultValue="unit"
                      disabled={!selectedFacilityId || !materials.length || Boolean(anyLoadError)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Supplier</span>
                    <select
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                      name="supplierId"
                      defaultValue=""
                      disabled={!selectedFacilityId || Boolean(anyLoadError)}
                    >
                      <option value="">—</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium">Reference</span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                    name="reference"
                    placeholder="PO, GRN, note (optional)"
                    disabled={!selectedFacilityId || Boolean(anyLoadError)}
                  />
                </label>

                <button
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                  type="submit"
                  disabled={!selectedFacilityId || !materials.length || Boolean(anyLoadError)}
                >
                  Save transaction
                </button>

                {!suppliers.length ? (
                  <div className="text-sm text-black/60 dark:text-white/60">
                    Optional: add suppliers in{" "}
                    <Link className="underline" href="/dashboard/suppliers">
                      Suppliers
                    </Link>
                    .
                  </div>
                ) : null}
              </form>
            </div>
          </div>

          <InventoryTransactionsPanel transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
