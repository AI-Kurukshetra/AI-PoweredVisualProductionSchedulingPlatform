-- Production lines belong to facilities

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.production_lines (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  name text not null,
  description text,
  capacity integer not null default 0,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'production_lines_set_updated_at'
  ) then
    create trigger production_lines_set_updated_at
      before update on public.production_lines
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists production_lines_facility_id_idx
  on public.production_lines (facility_id);

create index if not exists production_lines_updated_at_idx
  on public.production_lines (updated_at);

alter table public.production_lines enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'production_lines'
      and policyname = 'production_lines_select_org_owner'
  ) then
    create policy production_lines_select_org_owner
      on public.production_lines
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = production_lines.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'production_lines'
      and policyname = 'production_lines_insert_org_owner'
  ) then
    create policy production_lines_insert_org_owner
      on public.production_lines
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = production_lines.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'production_lines'
      and policyname = 'production_lines_update_org_owner'
  ) then
    create policy production_lines_update_org_owner
      on public.production_lines
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = production_lines.facility_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = production_lines.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'production_lines'
      and policyname = 'production_lines_delete_org_owner'
  ) then
    create policy production_lines_delete_org_owner
      on public.production_lines
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = production_lines.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

