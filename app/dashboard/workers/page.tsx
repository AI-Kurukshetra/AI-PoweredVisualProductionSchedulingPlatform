import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { listFacilities } from "@/lib/services/facilities";
import { listWorkers } from "@/lib/services/workers";
import { deleteWorkerAction, saveWorkerAction } from "./actions";

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const organizationId = typeof sp.organizationId === "string" ? sp.organizationId : "";
  const facilityId = typeof sp.facilityId === "string" ? sp.facilityId : "";
  const editWorkerId = typeof sp.editWorkerId === "string" ? sp.editWorkerId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/workers");
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

  let workers: Awaited<ReturnType<typeof listWorkers>> = [];
  let workersLoadError = "";
  try {
    workers = selectedFacilityId ? await listWorkers(supabase, { facilityId: selectedFacilityId }) : [];
  } catch (e) {
    workersLoadError = e instanceof Error ? e.message : "Failed to load workers.";
  }

  const workerToEdit = editWorkerId ? workers.find((w) => w.id === editWorkerId) : undefined;
  const anyLoadError = orgLoadError || facilitiesLoadError || workersLoadError;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Workers</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Select organization → facility, then manage workers (skills & availability).
          </p>
        </div>
        <Link
          className="rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:bg-white/5"
          href="/dashboard/facilities"
        >
          Facilities
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
                      href={`/dashboard/workers?organizationId=${encodeURIComponent(o.id)}`}
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
                        href={`/dashboard/workers?organizationId=${encodeURIComponent(
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
          </div>

          <div className="mt-6 border-t border-black/10 pt-6 dark:border-white/10">
            <h3 className="text-sm font-semibold">{workerToEdit ? "Edit worker" : "Add worker"}</h3>
            <form action={saveWorkerAction} className="mt-3 space-y-4">
              <input type="hidden" name="id" value={workerToEdit?.id ?? ""} />
              <input type="hidden" name="organizationId" value={selectedOrgId} />
              <input type="hidden" name="facilityId" value={selectedFacilityId} />

              <label className="block">
                <span className="text-sm font-medium">Name</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="name"
                  required
                  placeholder="e.g. Ananya Sharma"
                  defaultValue={workerToEdit?.name ?? ""}
                  disabled={Boolean(anyLoadError)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Role</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="role"
                  placeholder="e.g. Operator"
                  defaultValue={workerToEdit?.role ?? ""}
                  disabled={Boolean(anyLoadError)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Skills</span>
                <input
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="skills"
                  placeholder="e.g. welding, assembly, QC"
                  defaultValue={workerToEdit?.skills ?? ""}
                  disabled={Boolean(anyLoadError)}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Shift availability</span>
                <select
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                  name="shift_availability"
                  defaultValue={workerToEdit?.shift_availability ?? "any"}
                  disabled={Boolean(anyLoadError)}
                >
                  <option value="any">any</option>
                  <option value="shift-1">shift-1</option>
                  <option value="shift-2">shift-2</option>
                  <option value="shift-3">shift-3</option>
                  <option value="on-leave">on-leave</option>
                </select>
              </label>

              <div className="flex items-center gap-2">
                {workerToEdit ? (
                  <Link
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
                    href={`/dashboard/workers?organizationId=${encodeURIComponent(
                      selectedOrgId
                    )}&facilityId=${encodeURIComponent(selectedFacilityId)}`}
                  >
                    Cancel
                  </Link>
                ) : null}
                <button
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                  type="submit"
                  disabled={!selectedFacilityId || Boolean(anyLoadError)}
                >
                  {workerToEdit ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">Workers</h2>
            <div className="text-sm text-black/60 dark:text-white/60">{workers.length} total</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Skills</th>
                  <th className="px-4 py-3 font-medium">Shift</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {workers.length ? (
                  workers.map((w) => (
                    <tr key={w.id} className="bg-white/50 dark:bg-black/10">
                      <td className="px-4 py-3 font-medium">{w.name}</td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">{w.role ?? "—"}</td>
                      <td
                        className="max-w-[14rem] px-4 py-3 text-black/60 dark:text-white/60"
                        title={w.skills ?? ""}
                      >
                        <div className="truncate">{w.skills ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">
                        {w.shift_availability}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                            href={`/dashboard/workers?organizationId=${encodeURIComponent(
                              selectedOrgId
                            )}&facilityId=${encodeURIComponent(
                              selectedFacilityId
                            )}&editWorkerId=${encodeURIComponent(w.id)}`}
                          >
                            Edit
                          </Link>
                          <form action={deleteWorkerAction}>
                            <input type="hidden" name="id" value={w.id} />
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
                      colSpan={5}
                    >
                      {selectedFacilityId ? "No workers yet." : "Select a facility first."}
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
