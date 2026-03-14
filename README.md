Next.js (App Router) app with Supabase email/password auth (signup, login, logout) and a protected dashboard.

## Getting Started

## Local dev

1) Create `.env` from `.env.example` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2) Run the dev server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Routes

- `/signup` create account
- `/login` log in
- `/dashboard` protected page (redirects to `/login` if not signed in)

## Database schema (Supabase)

This repo keeps SQL migrations in `supabase/migrations/`.

- `supabase/migrations/20260314120000_create_organizations.sql` creates `public.organizations`:
  - `id` (uuid, PK)
  - `name` (text, required)
  - `description` (text)
  - `created_by` (uuid, defaults to `auth.uid()`)
  - `created_at` (timestamptz, defaults to `now()`)

- `supabase/migrations/20260314121000_create_facilities.sql` creates `public.facilities`:
  - `id` (uuid, PK)
  - `organization_id` (uuid, FK → `public.organizations.id`)
  - `name` (text, required)
  - `description` (text)
  - `created_by` (uuid, defaults to `auth.uid()`)
  - `created_at` (timestamptz, defaults to `now()`)

To apply: open Supabase Dashboard → SQL Editor → run the migration SQL (or use Supabase CLI migrations if you have it set up).

## Deploy (Vercel)

Set the same env vars in Vercel Project Settings, then deploy.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Notes

- Supabase auth stores sessions in HTTP-only cookies via SSR helpers.
- `/dashboard` is protected server-side (redirects to `/login` if no user session).
