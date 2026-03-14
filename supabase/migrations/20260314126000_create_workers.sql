-- Workers belong to facilities

create extension if not exists pgcrypto;

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  name text not null,
  role text,
  skills text,
  availability text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists workers_facility_id_idx
  on public.workers (facility_id);

create index if not exists workers_created_at_idx
  on public.workers (created_at);

alter table public.workers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workers'
      and policyname = 'workers_select_org_owner'
  ) then
    create policy workers_select_org_owner
      on public.workers
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = workers.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workers'
      and policyname = 'workers_insert_org_owner'
  ) then
    create policy workers_insert_org_owner
      on public.workers
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = workers.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workers'
      and policyname = 'workers_update_org_owner'
  ) then
    create policy workers_update_org_owner
      on public.workers
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = workers.facility_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = workers.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'workers'
      and policyname = 'workers_delete_org_owner'
  ) then
    create policy workers_delete_org_owner
      on public.workers
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = workers.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

