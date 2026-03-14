-- Create organizations table for VizPlan
-- Columns: id, name, description, created_by, created_at

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists organizations_created_by_idx
  on public.organizations (created_by);

create index if not exists organizations_created_at_idx
  on public.organizations (created_at);

alter table public.organizations enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'organizations_select_own'
  ) then
    create policy organizations_select_own
      on public.organizations
      for select
      to authenticated
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'organizations_insert_own'
  ) then
    create policy organizations_insert_own
      on public.organizations
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'organizations_update_own'
  ) then
    create policy organizations_update_own
      on public.organizations
      for update
      to authenticated
      using (created_by = auth.uid())
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizations'
      and policyname = 'organizations_delete_own'
  ) then
    create policy organizations_delete_own
      on public.organizations
      for delete
      to authenticated
      using (created_by = auth.uid());
  end if;
end $$;

