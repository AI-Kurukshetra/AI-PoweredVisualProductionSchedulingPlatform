import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listFacilities } from "@/lib/services/facilities";
import { deleteFacilityAction, saveFacilityAction } from "./actions";

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId =
    typeof sp.organizationId === "string" ? sp.organizationId : "";
  const editFacilityId =
    typeof sp.editFacilityId === "string" ? sp.editFacilityId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/facilities");
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
    facilities = selectedOrgId
      ? await listFacilities(supabase, { organizationId: selectedOrgId })
      : [];
  } catch (e) {
    facilitiesLoadError = e instanceof Error ? e.message : "Failed to load facilities.";
  }

  const facilityToEdit = editFacilityId
    ? facilities.find((f) => f.id === editFacilityId)
    : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Facilities</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Select an organization, then create and manage its facilities.
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

      {orgLoadError || facilitiesLoadError ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {(orgLoadError + " " + facilitiesLoadError).includes("schema cache") ? (
            <>
              Database not set up for this Supabase project. In Supabase Dashboard → SQL Editor,
              run `supabase/setup.sql`, then reload the API schema cache (Project Settings → API)
              and refresh this page.
            </>
          ) : (
            (orgLoadError || facilitiesLoadError)
          )}
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <h2 className="text-base font-semibold">Organization</h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Choose where this facility belongs.
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
	                    href={`/dashboard/facilities?organizationId=${encodeURIComponent(o.id)}`}
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
                  <Link className="font-medium text-black hover:underline dark:text-white" href="/dashboard/organizations">
                    Go to Organizations
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-black/10 pt-6 dark:border-white/10">
            <h3 className="text-sm font-semibold">
              {facilityToEdit ? "Edit facility" : "Create facility"}
            </h3>
            <form action={saveFacilityAction} className="mt-3 space-y-4">
              <input type="hidden" name="id" value={facilityToEdit?.id ?? ""} />
              <input type="hidden" name="organizationId" value={selectedOrgId} />

              <label className="block">
                <span className="text-sm font-medium">Name</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="name"
                  required
                  placeholder="e.g. Pune Plant"
                  disabled={Boolean(orgLoadError) || Boolean(facilitiesLoadError)}
                  defaultValue={facilityToEdit?.name ?? ""}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="description"
                  rows={3}
                  placeholder="Optional"
                  disabled={Boolean(orgLoadError) || Boolean(facilitiesLoadError)}
                  defaultValue={facilityToEdit?.description ?? ""}
                />
              </label>

              <div className="flex items-center gap-2">
                {facilityToEdit ? (
                  <Link
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
                    href={`/dashboard/facilities?organizationId=${encodeURIComponent(selectedOrgId)}`}
                  >
                    Cancel
                  </Link>
                ) : null}
                <button
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                  type="submit"
                  disabled={
                    !selectedOrgId || Boolean(orgLoadError) || Boolean(facilitiesLoadError)
                  }
                >
                  {facilityToEdit ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Facilities</h2>
            <div className="text-sm text-black/60 dark:text-white/60">{facilities.length} total</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {facilities.length ? (
                  facilities.map((f) => (
                    <tr key={f.id} className="bg-white/50 dark:bg-black/10">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          className="hover:underline"
                          href={`/dashboard/production-lines?organizationId=${encodeURIComponent(
                            selectedOrgId
                          )}&facilityId=${encodeURIComponent(f.id)}`}
                        >
                          {f.name}
                        </Link>
	                      </td>
	                      <td
	                        className="max-w-[22rem] px-4 py-3 text-black/60 dark:text-white/60"
	                        title={f.description ?? ""}
	                      >
	                        <div className="truncate">{f.description ?? "—"}</div>
	                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                            href={`/dashboard/production-lines?organizationId=${encodeURIComponent(
                              selectedOrgId
                            )}&facilityId=${encodeURIComponent(f.id)}`}
                          >
                            Lines
                          </Link>
                          <Link
                            className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                            href={`/dashboard/facilities?organizationId=${encodeURIComponent(
                              selectedOrgId
                            )}&editFacilityId=${encodeURIComponent(f.id)}`}
                          >
                            Edit
                          </Link>
                          <form action={deleteFacilityAction}>
                            <input type="hidden" name="id" value={f.id} />
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
                      colSpan={3}
                    >
                      {selectedOrgId ? "No facilities yet." : "Select an organization first."}
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
