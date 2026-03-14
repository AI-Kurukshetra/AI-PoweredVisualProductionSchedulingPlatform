import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Holiday, listHolidays } from "@/lib/services/calendar";
import { listOrganizations, type Organization } from "@/lib/services/organizations";
import {
  isSchemaCacheMissMessage,
  normalizeCalendarSchemaError,
} from "@/lib/services/supabase-helpers";
import { createHolidayAction, deleteHolidayAction } from "../actions";
import ConfirmSubmitDialog from "@/app/components/ConfirmSubmitDialog";

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const message = typeof params.message === "string" ? params.message : "";
  const error = normalizeCalendarSchemaError(
    typeof params.error === "string" ? params.error : ""
  );
  const organizationId = typeof params.organizationId === "string" ? params.organizationId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/calendar/holidays");
  }

  let organizations: Organization[] = [];
  let orgError = "";
  try {
    organizations = await listOrganizations(supabase);
  } catch (e) {
    orgError = normalizeCalendarSchemaError(e, "Unable to load organizations.");
  }

  const selectedOrgId = organizationId || organizations[0]?.id || "";
  let holidays: Holiday[] = [];
  try {
    if (selectedOrgId) {
      holidays = await listHolidays(supabase, { organizationId: selectedOrgId });
    }
  } catch (e) {
    orgError = normalizeCalendarSchemaError(e, "Unable to load holidays.");
  }

  const displayError = error || orgError;
  const schemaMissing = isSchemaCacheMissMessage(displayError);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">Holidays</p>
            <h1 className="mt-2 text-3xl font-semibold text-black dark:text-white">Holiday calendar</h1>
            <p className="text-sm text-black/60 dark:text-white/60">
              Capture factory-wide holidays so schedulers can respect these days off.
            </p>
          </div>
          <form className="flex flex-wrap items-center gap-3" method="get">
            <label className="text-sm">
              <span className="sr-only">Organization</span>
              <select
                name="organizationId"
                defaultValue={selectedOrgId}
                className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Switch
            </button>
          </form>
        </div>
        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            {message}
          </div>
        ) : null}
        {orgError ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
            {orgError}
          </div>
        ) : null}
      </div>

      {schemaMissing ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          Calendar tables are not available in this Supabase project yet. Run
          ` supabase/migrations/20260315140000_create_calendar_tables.sql `
          in the Supabase SQL Editor, then reload the page.
        </div>
      ) : null}

      {!schemaMissing ? <div className="space-y-4">
        {holidays.length ? (
          <div className="space-y-3">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-black/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold text-black dark:text-white">{holiday.name}</div>
                    <p className="text-sm text-black/60 dark:text-white/60">{holiday.date}</p>
                  </div>
                  <div>
                    <form id={`delete-holiday-${holiday.id}`} action={deleteHolidayAction} className="hidden">
                      <input type="hidden" name="id" value={holiday.id} />
                    </form>
                    <ConfirmSubmitDialog
                      formId={`delete-holiday-${holiday.id}`}
                      trigger={
                        <button
                          type="button"
                          className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black/60 hover:border-black/60 dark:border-white/10 dark:text-white/60 dark:hover:border-white/60"
                        >
                          Delete
                        </button>
                      }
                      title="Delete holiday"
                      description="Remove this holiday from the calendar."
                    />
                  </div>
                </div>
                {holiday.notes ? (
                  <p className="mt-2 text-sm text-black/70 dark:text-white/70">{holiday.notes}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-black/10 bg-white/80 p-6 text-sm text-black/60 dark:border-white/10 dark:bg-black/30">
            No holidays scheduled yet.
          </div>
        )}
      </div> : null}

      {!schemaMissing ? <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <h2 className="text-xl font-semibold text-black dark:text-white">Add holiday</h2>
        <form action={createHolidayAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="organizationId" value={selectedOrgId} />
          <label className="block">
            <span className="text-sm font-medium text-black dark:text-white">Name</span>
            <input
              name="name"
              required
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-black dark:text-white">Date</span>
            <input
              name="date"
              type="date"
              required
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-black dark:text-white">Notes</span>
            <textarea
              name="notes"
              rows={3}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white"
              placeholder="Optional context for this day"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Save holiday
            </button>
          </div>
        </form>
      </div> : null}
    </div>
  );
}
