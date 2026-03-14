-- Exception management: alerts table for conflicts and shortages

create extension if not exists pgcrypto;

-- Ensure updated_at trigger helper exists (setup.sql defines this too).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  facility_id uuid references public.facilities (id) on delete set null,
  alert_type text not null,
  severity text not null default 'medium',
  status text not null default 'open',
  fingerprint text not null,
  title text not null,
  message text not null,
  work_order_id uuid references public.work_orders (id) on delete set null,
  scheduling_task_id uuid references public.scheduling_tasks (id) on delete set null,
  machine_id uuid references public.machines (id) on delete set null,
  worker_id uuid references public.workers (id) on delete set null,
  material_id uuid references public.materials (id) on delete set null,
  meta jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, fingerprint),
  constraint alerts_severity_valid check (severity in ('low','medium','high','critical')),
  constraint alerts_status_valid check (status in ('open','acknowledged','resolved','dismissed'))
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'alerts_set_updated_at'
  ) then
    create trigger alerts_set_updated_at
      before update on public.alerts
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists alerts_org_status_idx
  on public.alerts (organization_id, status, updated_at desc);

create index if not exists alerts_facility_status_idx
  on public.alerts (facility_id, status, updated_at desc);

create index if not exists alerts_type_idx
  on public.alerts (alert_type);

alter table public.alerts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'alerts'
      and policyname = 'alerts_select_org_owner'
  ) then
    create policy alerts_select_org_owner
      on public.alerts
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = alerts.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'alerts'
      and policyname = 'alerts_insert_org_owner'
  ) then
    create policy alerts_insert_org_owner
      on public.alerts
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.organizations o
          where o.id = alerts.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'alerts'
      and policyname = 'alerts_update_org_owner'
  ) then
    create policy alerts_update_org_owner
      on public.alerts
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = alerts.organization_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.organizations o
          where o.id = alerts.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'alerts'
      and policyname = 'alerts_delete_org_owner'
  ) then
    create policy alerts_delete_org_owner
      on public.alerts
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = alerts.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');

