import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listOrganizations } from "@/lib/services/organizations";
import { deleteOrganizationAction, saveOrganizationAction } from "./actions";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const editId = typeof sp.editId === "string" ? sp.editId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/organizations");
  }

  let organizations: Awaited<ReturnType<typeof listOrganizations>> = [];
  let loadError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load organizations.";
  }

  const organizationToEdit = editId ? organizations.find((o) => o.id === editId) : undefined;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Organizations</h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Create and manage organizations for your facilities and production lines.
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

      {loadError ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {loadError.includes("schema cache") ? (
            <>
              Database not set up for this Supabase project (missing `public.organizations`). In
              Supabase Dashboard → SQL Editor, run `supabase/setup.sql`, then reload the API schema
              cache (Project Settings → API) and refresh this page.
            </>
          ) : (
            loadError
          )}
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <h2 className="text-base font-semibold">
            {organizationToEdit ? "Edit organization" : "Create organization"}
          </h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Add an organization to group facilities and production lines.
          </p>

          <form action={saveOrganizationAction} className="mt-4 space-y-4">
            <input type="hidden" name="id" value={organizationToEdit?.id ?? ""} />
            <label className="block">
              <span className="text-sm font-medium">Name</span>
              <input
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                name="name"
                required
                placeholder="e.g. Acme Manufacturing"
                disabled={Boolean(loadError)}
                defaultValue={organizationToEdit?.name ?? ""}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Description</span>
              <textarea
                className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
                name="description"
                rows={3}
                placeholder="Optional"
                disabled={Boolean(loadError)}
                defaultValue={organizationToEdit?.description ?? ""}
              />
            </label>

            <div className="flex items-center gap-2">
              {organizationToEdit ? (
                <Link
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:text-white dark:hover:bg-white/5"
                  href="/dashboard/organizations"
                >
                  Cancel
                </Link>
              ) : null}
              <button
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                type="submit"
                disabled={Boolean(loadError)}
              >
                {organizationToEdit ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold">All organizations</h2>
            <div className="text-sm text-black/60 dark:text-white/60">
              {organizations.length} total
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Manage</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {organizations.length ? (
                  organizations.map((o) => (
                    <tr key={o.id} className="bg-white/50 dark:bg-black/10">
	                      <td className="px-4 py-3 font-medium">{o.name}</td>
	                      <td
	                        className="max-w-[22rem] px-4 py-3 text-black/60 dark:text-white/60"
	                        title={o.description ?? ""}
	                      >
	                        <div className="truncate">{o.description ?? "—"}</div>
	                      </td>
                      <td className="px-4 py-3 text-black/60 dark:text-white/60">
                        {new Date(o.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                          href={`/dashboard/facilities?organizationId=${encodeURIComponent(o.id)}`}
                        >
                          Facilities
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            className="rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                            href={`/dashboard/organizations?editId=${encodeURIComponent(o.id)}`}
                          >
                            Edit
                          </Link>
                          <form action={deleteOrganizationAction}>
                            <input type="hidden" name="id" value={o.id} />
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
                      No organizations yet. Create your first one.
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
