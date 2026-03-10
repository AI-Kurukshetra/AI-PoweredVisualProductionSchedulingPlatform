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
    <div className="rounded-2xl border border-black/10 bg-white/70 p-8 shadow-sm backdrop-blur">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-2 text-sm text-black/60">
          Use your email and password to access your account.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      <form action={signIn} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-black/30 focus:border-black/20"
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
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none ring-0 placeholder:text-black/30 focus:border-black/20"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Your password"
          />
        </label>

        <button
          className="inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/90"
          type="submit"
        >
          Continue
        </button>
      </form>

      <p className="mt-6 text-sm text-black/60">
        New here?{" "}
        <Link className="font-medium text-black hover:underline" href="/signup">
          Create an account
        </Link>
        .
      </p>
    </div>
  );
}

