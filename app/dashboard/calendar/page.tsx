import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CalendarPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/calendar");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/40">
        <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">Production calendar</p>
        <h1 className="mt-2 text-3xl font-semibold text-black dark:text-white">Shifts, maintenance, holidays</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Manage the guardrails that keep machines and people in sync. Define shifts, log holidays, and
          schedule maintenance blocks so scheduling stays predictable.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/dashboard/calendar/shifts"
          className="group rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm transition hover:border-black/30 hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:border-white/40"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">Shifts</p>
          <h2 className="mt-2 text-xl font-semibold text-black dark:text-white">Define patterns</h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Capture shift windows and days of week for your operations.
          </p>
        </Link>
        <Link
          href="/dashboard/calendar/holidays"
          className="group rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm transition hover:border-black/30 hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:border-white/40"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">Holidays</p>
          <h2 className="mt-2 text-xl font-semibold text-black dark:text-white">Mark downtime</h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Keep everyone aware of plant-wide shutdowns and public holidays.
          </p>
        </Link>
        <Link
          href="/dashboard/calendar/maintenance"
          className="group rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm transition hover:border-black/30 hover:bg-black/5 dark:border-white/10 dark:bg-black/30 dark:hover:border-white/40"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">Maintenance</p>
          <h2 className="mt-2 text-xl font-semibold text-black dark:text-white">Protect machines</h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Schedule repairs and inspections so machines appear as blocked time to schedulers.
          </p>
        </Link>
      </div>
    </div>
  );
}
