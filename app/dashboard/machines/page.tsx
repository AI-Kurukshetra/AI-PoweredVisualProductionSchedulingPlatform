import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listFacilities } from "@/lib/services/facilities";
import { listProductionLines } from "@/lib/services/production-lines";
import { listMachines } from "@/lib/services/machines";
import { deleteMachineAction, saveMachineAction } from "./actions";

export default async function MachinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";
  const facilityId = typeof sp.facilityId === "string" ? sp.facilityId : "";
  const productionLineId =
    typeof sp.productionLineId === "string" ? sp.productionLineId : "";
  const editMachineId = typeof sp.editMachineId === "string" ? sp.editMachineId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/machines");
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
  let facilitiesLoadError = "";
  try {
    facilities = selectedOrgId ? await listFacilities(supabase, { organizationId: selectedOrgId }) : [];
  } catch (e) {
    facilitiesLoadError = e instanceof Error ? e.message : "Failed to load facilities.";
  }

  const selectedFacilityId = facilityId || facilities[0]?.id || "";

  let productionLines: Awaited<ReturnType<typeof listProductionLines>> = [];
  let linesLoadError = "";
  try {
    productionLines = selectedFacilityId
      ? await listProductionLines(supabase, { facilityId: selectedFacilityId })
      : [];
  } catch (e) {
    linesLoadError = e instanceof Error ? e.message : "Failed to load production lines.";
  }

  const selectedProductionLineId = productionLineId || productionLines[0]?.id || "";

  let machines: Awaited<ReturnType<typeof listMachines>> = [];
  let machinesLoadError = "";
  try {
    machines = selectedProductionLineId
      ? await listMachines(supabase, { productionLineId: selectedProductionLineId })
      : [];
  } catch (e) {
    machinesLoadError = e instanceof Error ? e.message : "Failed to load machines.";
  }

  const machineToEdit = editMachineId ? machines.find((m) => m.id === editMachineId) : undefined;

  const anyLoadError =
    orgLoadError || facilitiesLoadError || linesLoadError || machinesLoadError;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Machines</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Select organization → facility → line, then manage machines.
          </p>
        </div>
        <Link
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
          href="/dashboard/production-lines"
        >
          Production lines
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

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <h2 className="text-base font-semibold">Select</h2>

          <div className="mt-4 space-y-4">
            <div>
              <div className="text-xs font-semibold text-black/60 dark:text-white/60">
                Organization
              </div>
              <div className="mt-2 space-y-2">
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
                      href={`/dashboard/machines?organizationId=${encodeURIComponent(o.id)}`}
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
            </div>

            <div>
              <div className="text-xs font-semibold text-black/60 dark:text-white/60">
                Facility
              </div>
              <div className="mt-2 space-y-2">
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
                        href={`/dashboard/machines?organizationId=${encodeURIComponent(
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
                    Select an organization first.
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-black/60 dark:text-white/60">
                Production line
              </div>
              <div className="mt-2 space-y-2">
                {productionLines.length ? (
                  productionLines.map((pl) => {
                    const isSelected = pl.id === selectedProductionLineId;
                    return (
                      <Link
                        key={pl.id}
                        className={[
                          "block rounded-2xl border px-4 py-3 text-sm transition-colors",
                          isSelected
                            ? "border-black bg-black text-white ring-2 ring-black/10 dark:border-white/15 dark:ring-white/10"
                            : "border-black/10 bg-white/50 hover:bg-black/5 dark:border-white/10 dark:bg-black/10 dark:hover:bg-white/5",
                        ].join(" ")}
                        href={`/dashboard/machines?organizationId=${encodeURIComponent(
                          selectedOrgId
                        )}&facilityId=${encodeURIComponent(
                          selectedFacilityId
                        )}&productionLineId=${encodeURIComponent(pl.id)}`}
                        aria-current={isSelected ? "page" : undefined}
                      >
                        <div className="font-medium">{pl.name}</div>
                        <div
                          className={[
                            "mt-1 text-xs",
                            isSelected ? "text-white/70" : "text-black/60 dark:text-white/60",
                          ].join(" ")}
                        >
                          Capacity: {pl.capacity}
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-black/10 bg-white/50 px-4 py-4 text-sm text-black/60 dark:border-white/10 dark:bg-black/10 dark:text-white/60">
                    Select a facility first.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-black/10 pt-6 dark:border-white/10">
            <h3 className="text-sm font-semibold">
              {machineToEdit ? "Edit machine" : "Add machine"}
            </h3>
            <form action={saveMachineAction} className="mt-3 space-y-4">
              <input type="hidden" name="id" value={machineToEdit?.id ?? ""} />
              <input type="hidden" name="organizationId" value={selectedOrgId} />
              <input type="hidden" name="facilityId" value={selectedFacilityId} />
              <input type="hidden" name="productionLineId" value={selectedProductionLineId} />

              <label className="block">
                <span className="text-sm font-medium">Name</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="name"
                  required
                  placeholder="e.g. CNC-01"
                  defaultValue={machineToEdit?.name ?? ""}
                  disabled={Boolean(anyLoadError)}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium">Type</span>
                  <input
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                    name="type"
                    placeholder="e.g. CNC"
                    defaultValue={machineToEdit?.type ?? ""}
                    disabled={Boolean(anyLoadError)}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium">Status</span>
                  <select
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
                    name="status"
                    defaultValue={machineToEdit?.status ?? "active"}
                    disabled={Boolean(anyLoadError)}
                  >
                    <option value="active">active</option>
                    <option value="maintenance">maintenance</option>
                    <option value="offline">offline</option>
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium">Capacity</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="capacity"
                  type="number"
                  min={0}
                  step={1}
                  required
                  placeholder="0"
                  defaultValue={machineToEdit?.capacity ?? 0}
                  disabled={Boolean(anyLoadError)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Setup time (min)</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="setup_time"
                  type="number"
                  min={0}
                  step={1}
                  required
                  placeholder="0"
                  defaultValue={machineToEdit?.setup_time ?? 0}
                  disabled={Boolean(anyLoadError)}
                />
              </label>

              <div className="flex items-center gap-2">
                {machineToEdit ? (
                  <Link
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
                    href={`/dashboard/machines?organizationId=${encodeURIComponent(
                      selectedOrgId
                    )}&facilityId=${encodeURIComponent(
                      selectedFacilityId
                    )}&productionLineId=${encodeURIComponent(selectedProductionLineId)}`}
                  >
                    Cancel
                  </Link>
                ) : null}
                <button
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                  type="submit"
                  disabled={!selectedProductionLineId || Boolean(anyLoadError)}
                >
                  {machineToEdit ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Machines</h2>
            <div className="text-sm text-black/60 dark:text-white/60">{machines.length} total</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Capacity</th>
                  <th className="px-4 py-3 font-medium">Setup (min)</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {machines.length ? (
                  machines.map((m) => (
                    <tr key={m.id} className="bg-white/50 dark:bg-black/10">
                      <td className="px-4 py-3 font-medium">{m.name}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">{m.type ?? "—"}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">{m.status}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">{m.capacity}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">
                        {m.setup_time}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                            href={`/dashboard/machines?organizationId=${encodeURIComponent(
                              selectedOrgId
                            )}&facilityId=${encodeURIComponent(
                              selectedFacilityId
                            )}&productionLineId=${encodeURIComponent(
                              selectedProductionLineId
                            )}&editMachineId=${encodeURIComponent(m.id)}`}
                          >
                            Edit
                          </Link>
                          <form action={deleteMachineAction}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="organizationId" value={selectedOrgId} />
                            <input type="hidden" name="facilityId" value={selectedFacilityId} />
                            <input
                              type="hidden"
                              name="productionLineId"
                              value={selectedProductionLineId}
                            />
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
                      colSpan={6}
                    >
                      {selectedProductionLineId ? "No machines yet." : "Select a production line first."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
