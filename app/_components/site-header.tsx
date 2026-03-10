import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export default async function SiteHeader() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/70 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link className="font-semibold tracking-tight" href="/">
          Hackathon App
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link className="rounded-lg px-3 py-2 hover:bg-black/5" href="/dashboard">
                Dashboard
              </Link>
              <form action={signOut}>
                <button
                  className="rounded-lg px-3 py-2 text-black/70 hover:bg-black/5 hover:text-black"
                  type="submit"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="rounded-lg px-3 py-2 hover:bg-black/5" href="/login">
                Log in
              </Link>
              <Link
                className="rounded-lg bg-black px-3 py-2 font-medium text-white hover:bg-black/90"
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
