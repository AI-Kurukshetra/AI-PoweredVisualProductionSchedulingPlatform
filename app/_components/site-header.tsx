import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export default async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/60">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-black text-sm font-semibold uppercase tracking-[0.4em] text-white shadow-lg">
            VP
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-black/50 dark:text-white/50">VizPlan</p>
            <p className="text-sm font-semibold text-black dark:text-white">AI-powered scheduling</p>
          </div>
        </div>

        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link
                className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:border-black hover:text-black dark:border-white/20 dark:text-white dark:hover:text-white"
                href="/dashboard"
              >
                Dashboard
              </Link>
              <form action={signOut}>
                <button
                  className="rounded-full border border-transparent bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black/90"
                  type="submit"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:bg-black/5"
                href="/login"
              >
                Log in
              </Link>
              <Link
                className="rounded-xl bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-black/90"
                href="/signup"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
