import Link from "next/link";
import { signUp } from "../actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-8 shadow-sm backdrop-blur">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>
        <p className="mt-2 text-sm text-black/60">
          Sign up with email and password.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <form action={signUp} className="space-y-4">
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
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="At least 8 characters"
          />
        </label>

        <button
          className="inline-flex w-full items-center justify-center rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/90"
          type="submit"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-sm text-black/60">
        Already have an account?{" "}
        <Link className="font-medium text-black hover:underline" href="/login">
          Log in
        </Link>
        .
      </p>
    </div>
  );
}

