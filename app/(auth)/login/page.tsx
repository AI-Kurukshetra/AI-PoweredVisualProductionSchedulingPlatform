import Link from "next/link";
import { signIn } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const redirectTo = typeof sp.redirectTo === "string" ? sp.redirectTo : "/dashboard";

  return (
    <>
      <Link className="inline-flex items-center gap-3" href="/">
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-black text-xs font-semibold text-white dark:bg-white dark:text-black">
          VZ
        </div>
        <span className="text-sm font-semibold tracking-tight">VizPlan</span>
      </Link>

      <div className="mb-6 mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Use your email and password to continue.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {message}
        </div>
      ) : null}

      <form action={signIn} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-black/35 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-white/35"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Your password"
          />
        </label>

        <button
          className="inline-flex w-full items-center justify-center rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-4 focus:ring-black/10 dark:bg-white dark:text-black dark:hover:bg-white/90 dark:focus:ring-white/10"
          type="submit"
        >
          Continue
        </button>
      </form>

      <p className="mt-6 text-sm text-black/60 dark:text-white/60">
        New here?{" "}
        <Link className="font-medium text-black hover:underline dark:text-white" href="/signup">
          Create an account
        </Link>
        .
      </p>
    </>
  );
}
