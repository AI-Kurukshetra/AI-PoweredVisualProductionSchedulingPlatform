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
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Operations overview</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        Signed in as <span className="font-medium text-black dark:text-white">{user.email}</span>.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <h2 className="text-base font-semibold">Today’s plan</h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Connect your orders and routings to generate a visual schedule with capacity checks.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/20">
          <h2 className="text-base font-semibold">AI suggestions</h2>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            See recommended sequencing, bottleneck alerts, and operator-to-task matches.
          </p>
        </div>
      </div>
    </div>
  );
}
