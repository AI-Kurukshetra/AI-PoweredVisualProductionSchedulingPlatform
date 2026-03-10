import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20">
      <div className="rounded-3xl border border-black/10 bg-white/60 p-10 shadow-sm backdrop-blur">
        <h1 className="text-4xl font-semibold tracking-tight">
          Next.js + Supabase Auth
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-black/60">
          Registration, login, logout, and a protected dashboard using Supabase SSR
          cookies. Configure env vars and deploy to Vercel.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {user ? (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-medium text-white hover:bg-black/90"
              href="/dashboard"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-medium text-white hover:bg-black/90"
                href="/signup"
              >
                Create account
              </Link>
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-5 text-sm font-medium hover:bg-black/5"
                href="/login"
              >
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
