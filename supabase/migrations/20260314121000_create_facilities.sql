-- Facilities belong to organizations

create extension if not exists pgcrypto;

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists facilities_organization_id_idx
  on public.facilities (organization_id);

create index if not exists facilities_created_at_idx
  on public.facilities (created_at);

alter table public.facilities enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'facilities'
      and policyname = 'facilities_select_org_owner'
  ) then
    create policy facilities_select_org_owner
      on public.facilities
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = facilities.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'facilities'
      and policyname = 'facilities_insert_org_owner'
  ) then
    create policy facilities_insert_org_owner
      on public.facilities
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.organizations o
          where o.id = facilities.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'facilities'
      and policyname = 'facilities_update_org_owner'
  ) then
    create policy facilities_update_org_owner
      on public.facilities
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = facilities.organization_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.organizations o
          where o.id = facilities.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'facilities'
      and policyname = 'facilities_delete_org_owner'
  ) then
    create policy facilities_delete_org_owner
      on public.facilities
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = facilities.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

