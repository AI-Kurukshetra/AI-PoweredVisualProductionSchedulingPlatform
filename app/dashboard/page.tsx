import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard");
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-2 text-sm text-black/60">
        You are signed in as <span className="font-medium text-black">{user.email}</span>.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur">
          <h2 className="text-base font-semibold">Session</h2>
          <p className="mt-2 text-sm text-black/60">
            Supabase auth cookies are set server-side and refreshed via middleware on protected routes.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur">
          <h2 className="text-base font-semibold">Next step</h2>
          <p className="mt-2 text-sm text-black/60">
            Add your app tables in Supabase, then query them from Server Components using the same server client.
          </p>
        </div>
      </div>
    </div>
  );
}
