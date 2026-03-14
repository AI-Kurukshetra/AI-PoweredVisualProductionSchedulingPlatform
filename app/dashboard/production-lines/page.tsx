import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listFacilities } from "@/lib/services/facilities";
import { listProductionLines } from "@/lib/services/production-lines";
import {
  saveProductionLineAction,
  deleteProductionLineAction,
} from "./actions";

type FacilityBrief = { id: string; organization_id: string; name: string };

export default async function ProductionLinesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId =
    typeof sp.organizationId === "string" ? sp.organizationId : "";
  const facilityId = typeof sp.facilityId === "string" ? sp.facilityId : "";
  const editLineId = typeof sp.editLineId === "string" ? sp.editLineId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/production-lines");
  }

  let organizations: Awaited<ReturnType<typeof listOrganizations>> = [];
  let orgLoadError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    orgLoadError = e instanceof Error ? e.message : "Failed to load organizations.";
  }

  let inferredOrgId = organizationId;
  let inferredFacility: FacilityBrief | null = null;

  if (!inferredOrgId && facilityId) {
    const { data } = await supabase
      .from("facilities")
      .select("id,organization_id,name")
      .eq("id", facilityId)
      .single();
    inferredFacility = (data as FacilityBrief | null) ?? null;
    inferredOrgId = inferredFacility?.organization_id ?? "";
  }

  const selectedOrgId = inferredOrgId || organizations[0]?.id || "";
  let facilities: Awaited<ReturnType<typeof listFacilities>> = [];
  let facilitiesLoadError = "";
  try {
    facilities = selectedOrgId
      ? await listFacilities(supabase, { organizationId: selectedOrgId })
      : [];
  } catch (e) {
    facilitiesLoadError = e instanceof Error ? e.message : "Failed to load facilities.";
  }

  const selectedFacilityId = facilityId || inferredFacility?.id || facilities[0]?.id || "";
  let productionLines: Awaited<ReturnType<typeof listProductionLines>> = [];
  let linesLoadError = "";
  try {
    productionLines = selectedFacilityId
      ? await listProductionLines(supabase, { facilityId: selectedFacilityId })
      : [];
  } catch (e) {
    linesLoadError = e instanceof Error ? e.message : "Failed to load production lines.";
  }

  const lineToEdit = editLineId ? productionLines.find((l) => l.id === editLineId) : undefined;

  const selectedFacilityName =
    inferredFacility?.id === selectedFacilityId
      ? inferredFacility.name
      : facilities.find((f) => f.id === selectedFacilityId)?.name ?? "";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Production lines</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Select an organization and facility, then add production lines with capacity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
            href={`/dashboard/facilities${selectedOrgId ? `?organizationId=${encodeURIComponent(selectedOrgId)}` : ""}`}
          >
            Facilities
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

      {orgLoadError || facilitiesLoadError || linesLoadError ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {(orgLoadError + " " + facilitiesLoadError + " " + linesLoadError).includes(
            "schema cache"
          ) ? (
            <>
              Database not set up for this Supabase project. In Supabase Dashboard → SQL Editor,
              run `supabase/setup.sql`, then reload the API schema cache (Project Settings → API)
              and refresh this page.
            </>
          ) : (
            (orgLoadError || facilitiesLoadError || linesLoadError)
          )}
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
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
	                    href={`/dashboard/production-lines?organizationId=${encodeURIComponent(o.id)}`}
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
                  <Link className="font-medium text-black hover:underline dark:text-white" href="/dashboard/organizations">
                    Create an organization
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
	                      href={`/dashboard/production-lines?organizationId=${encodeURIComponent(
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
	                  {selectedOrgId ? (
	                    <>
                      No facilities yet.
                      <div className="mt-3">
                        <Link
                          className="font-medium text-black hover:underline dark:text-white"
                          href={`/dashboard/facilities?organizationId=${encodeURIComponent(selectedOrgId)}`}
                        >
                          Create a facility
                        </Link>
                      </div>
                    </>
                  ) : (
                    "Select an organization first."
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Lines</h2>
              <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                {selectedFacilityName ? `Facility: ${selectedFacilityName}` : "Select a facility"}
              </div>
            </div>
            <div className="text-sm text-black/60 dark:text-white/60">
              {productionLines.length} total
            </div>
          </div>

	          <div className="mt-6 rounded-2xl border border-black/10 bg-white/50 p-5 dark:border-white/10 dark:bg-black/10">
	            <h3 className="text-sm font-semibold">
	              {lineToEdit ? "Edit production line" : "Add production line"}
	            </h3>
	            <form action={saveProductionLineAction} className="mt-4 space-y-4">
	              <input type="hidden" name="id" value={lineToEdit?.id ?? ""} />
	              <input type="hidden" name="organizationId" value={selectedOrgId} />
	              <input type="hidden" name="facilityId" value={selectedFacilityId} />

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium">Name</span>
	                  <input
	                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
	                    name="name"
	                    required
	                    placeholder="e.g. Line 1"
	                    disabled={Boolean(orgLoadError) || Boolean(facilitiesLoadError) || Boolean(linesLoadError)}
	                    defaultValue={lineToEdit?.name ?? ""}
	                  />
	                </label>

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
	                    disabled={Boolean(orgLoadError) || Boolean(facilitiesLoadError) || Boolean(linesLoadError)}
	                    defaultValue={lineToEdit?.capacity ?? 0}
	                  />
	                </label>
	              </div>

              <label className="block">
                <span className="text-sm font-medium">Description</span>
	                <textarea
	                  className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
	                  name="description"
	                  rows={3}
	                  placeholder="Optional"
	                  disabled={Boolean(orgLoadError) || Boolean(facilitiesLoadError) || Boolean(linesLoadError)}
	                  defaultValue={lineToEdit?.description ?? ""}
	                />
	              </label>

	              <div className="flex items-center gap-2">
	                {lineToEdit ? (
	                  <Link
	                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
	                    href={`/dashboard/production-lines?organizationId=${encodeURIComponent(
	                      selectedOrgId
	                    )}&facilityId=${encodeURIComponent(selectedFacilityId)}`}
	                  >
	                    Cancel
	                  </Link>
	                ) : null}
	                <button
	                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
	                  type="submit"
	                  disabled={
	                    !selectedFacilityId ||
	                    Boolean(orgLoadError) ||
	                    Boolean(facilitiesLoadError) ||
	                    Boolean(linesLoadError)
	                  }
	                >
	                  {lineToEdit ? "Update" : "Add"}
	                </button>
	              </div>
	            </form>
	          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Capacity</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {productionLines.length ? (
                  productionLines.map((l) => (
                    <tr key={l.id} className="bg-white/50 dark:bg-black/10">
                      <td className="px-4 py-3 font-medium">{l.name}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">
                        {l.capacity}
                      </td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">
                        {new Date(l.updated_at).toLocaleDateString()}
	                      </td>
	                      <td className="px-4 py-3 text-right">
	                        <div className="flex items-center justify-end gap-2">
	                          <Link
	                            className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
	                            href={`/dashboard/production-lines?organizationId=${encodeURIComponent(
	                              selectedOrgId
	                            )}&facilityId=${encodeURIComponent(
	                              selectedFacilityId
	                            )}&editLineId=${encodeURIComponent(l.id)}`}
	                          >
	                            Edit
	                          </Link>

	                          <form action={deleteProductionLineAction}>
	                            <input type="hidden" name="id" value={l.id} />
	                            <input type="hidden" name="organizationId" value={selectedOrgId} />
                            <input type="hidden" name="facilityId" value={selectedFacilityId} />
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
                      {selectedFacilityId ? "No production lines yet." : "Select a facility first."}
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
