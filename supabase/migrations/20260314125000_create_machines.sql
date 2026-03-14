-- Machines belong to production lines

create extension if not exists pgcrypto;

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  production_line_id uuid not null references public.production_lines (id) on delete cascade,
  name text not null,
  type text,
  status text not null default 'active',
  capacity integer not null default 0,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists machines_production_line_id_idx
  on public.machines (production_line_id);

create index if not exists machines_created_at_idx
  on public.machines (created_at);

alter table public.machines enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'machines'
      and policyname = 'machines_select_org_owner'
  ) then
    create policy machines_select_org_owner
      on public.machines
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.production_lines pl
          join public.facilities f on f.id = pl.facility_id
          join public.organizations o on o.id = f.organization_id
          where pl.id = machines.production_line_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'machines'
      and policyname = 'machines_insert_org_owner'
  ) then
    create policy machines_insert_org_owner
      on public.machines
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.production_lines pl
          join public.facilities f on f.id = pl.facility_id
          join public.organizations o on o.id = f.organization_id
          where pl.id = machines.production_line_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'machines'
      and policyname = 'machines_update_org_owner'
  ) then
    create policy machines_update_org_owner
      on public.machines
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.production_lines pl
          join public.facilities f on f.id = pl.facility_id
          join public.organizations o on o.id = f.organization_id
          where pl.id = machines.production_line_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.production_lines pl
          join public.facilities f on f.id = pl.facility_id
          join public.organizations o on o.id = f.organization_id
          where pl.id = machines.production_line_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'machines'
      and policyname = 'machines_delete_org_owner'
  ) then
    create policy machines_delete_org_owner
      on public.machines
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.production_lines pl
          join public.facilities f on f.id = pl.facility_id
          join public.organizations o on o.id = f.organization_id
          where pl.id = machines.production_line_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

