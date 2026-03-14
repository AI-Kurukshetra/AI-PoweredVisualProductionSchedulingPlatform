import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/60 p-10 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/25 via-sky-500/20 to-emerald-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-gradient-to-tr from-fuchsia-500/15 via-amber-500/20 to-indigo-500/20 blur-3xl" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black text-sm font-semibold text-white dark:bg-white dark:text-black">
              VP
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">VizPlan</div>
              <div className="text-xs text-black/60 dark:text-white/60">
                AI-powered visual production scheduling
              </div>
            </div>
          </div>

          <h1 className="mt-8 text-4xl font-semibold tracking-tight sm:text-5xl">
            Visual scheduling for high-mix production—with AI you can trust.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-black/65 dark:text-white/65">
            Optimize manufacturing operations with real-time scheduling, resource allocation,
            and workflow visualization. Get intelligent recommendations while keeping people in
            control.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {user ? (
              <>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-black px-5 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                  href="/dashboard"
                >
                  Open dashboard
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/40 dark:text-white dark:hover:bg-white/5"
                  href="/dashboard"
                >
                  View today’s plan
                </Link>
              </>
            ) : (
              <>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-black px-5 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
                  href="/signup"
                >
                  Create account
                </Link>
                <Link
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-medium text-black hover:bg-black/5 dark:border-white/10 dark:bg-black/40 dark:text-white dark:hover:bg-white/5"
                  href="/login"
                >
                  Log in
                </Link>
              </>
            )}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/10 bg-white/60 p-5 backdrop-blur dark:border-white/10 dark:bg-black/20">
              <div className="text-sm font-semibold">Real-time capacity</div>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                See load vs. availability across lines, shifts, and constraints.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/60 p-5 backdrop-blur dark:border-white/10 dark:bg-black/20">
              <div className="text-sm font-semibold">AI sequencing</div>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Get suggestions for what to run next—then approve, tweak, or override.
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/60 p-5 backdrop-blur dark:border-white/10 dark:bg-black/20">
              <div className="text-sm font-semibold">Talent-centric dispatch</div>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                Match work to skills and reduce changeovers in high-mix environments.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-black/10 bg-white/40 p-6 backdrop-blur dark:border-white/10 dark:bg-black/15">
            <div className="text-sm font-semibold">How it works</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <div className="text-sm">
                <div className="font-medium">1) Ingest</div>
                <div className="mt-1 text-black/60 dark:text-white/60">Orders, routings, resources</div>
              </div>
              <div className="text-sm">
                <div className="font-medium">2) Plan</div>
                <div className="mt-1 text-black/60 dark:text-white/60">Visual schedule + what-if</div>
              </div>
              <div className="text-sm">
                <div className="font-medium">3) Dispatch</div>
                <div className="mt-1 text-black/60 dark:text-white/60">Work to lines & people</div>
              </div>
              <div className="text-sm">
                <div className="font-medium">4) Improve</div>
                <div className="mt-1 text-black/60 dark:text-white/60">Learn from outcomes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
