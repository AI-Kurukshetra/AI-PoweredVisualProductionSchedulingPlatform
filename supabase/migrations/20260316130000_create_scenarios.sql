-- Scenario Planning (What-If Scheduling)

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

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  facility_id uuid references public.facilities (id) on delete set null,
  name text not null,
  description text,
  range_start timestamptz,
  range_end timestamptz,
  status text not null default 'draft',
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scenarios_status_valid check (status in ('draft','archived'))
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'scenarios_set_updated_at'
  ) then
    create trigger scenarios_set_updated_at
      before update on public.scenarios
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists scenarios_org_updated_idx
  on public.scenarios (organization_id, updated_at desc);

create index if not exists scenarios_facility_updated_idx
  on public.scenarios (facility_id, updated_at desc);

alter table public.scenarios enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scenarios'
      and policyname = 'scenarios_select_org_owner'
  ) then
    create policy scenarios_select_org_owner
      on public.scenarios
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = scenarios.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scenarios'
      and policyname = 'scenarios_insert_org_owner'
  ) then
    create policy scenarios_insert_org_owner
      on public.scenarios
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.organizations o
          where o.id = scenarios.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scenarios'
      and policyname = 'scenarios_update_org_owner'
  ) then
    create policy scenarios_update_org_owner
      on public.scenarios
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = scenarios.organization_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.organizations o
          where o.id = scenarios.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scenarios'
      and policyname = 'scenarios_delete_org_owner'
  ) then
    create policy scenarios_delete_org_owner
      on public.scenarios
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = scenarios.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

create table if not exists public.scenario_tasks (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios (id) on delete cascade,
  base_task_id uuid references public.scheduling_tasks (id) on delete set null,
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  operation_id uuid references public.operations (id) on delete set null,
  production_line_id uuid references public.production_lines (id) on delete set null,
  machine_id uuid references public.machines (id) on delete set null,
  worker_id uuid references public.workers (id) on delete set null,
  start_time timestamptz,
  end_time timestamptz,
  status text not null default 'scheduled',
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scenario_id, base_task_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'scenario_tasks_set_updated_at'
  ) then
    create trigger scenario_tasks_set_updated_at
      before update on public.scenario_tasks
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists scenario_tasks_scenario_idx
  on public.scenario_tasks (scenario_id, updated_at desc);

create index if not exists scenario_tasks_work_order_idx
  on public.scenario_tasks (work_order_id);

alter table public.scenario_tasks enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scenario_tasks'
      and policyname = 'scenario_tasks_select_org_owner'
  ) then
    create policy scenario_tasks_select_org_owner
      on public.scenario_tasks
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.scenarios s
          join public.organizations o on o.id = s.organization_id
          where s.id = scenario_tasks.scenario_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scenario_tasks'
      and policyname = 'scenario_tasks_insert_org_owner'
  ) then
    create policy scenario_tasks_insert_org_owner
      on public.scenario_tasks
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.scenarios s
          join public.organizations o on o.id = s.organization_id
          where s.id = scenario_tasks.scenario_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scenario_tasks'
      and policyname = 'scenario_tasks_update_org_owner'
  ) then
    create policy scenario_tasks_update_org_owner
      on public.scenario_tasks
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.scenarios s
          join public.organizations o on o.id = s.organization_id
          where s.id = scenario_tasks.scenario_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.scenarios s
          join public.organizations o on o.id = s.organization_id
          where s.id = scenario_tasks.scenario_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scenario_tasks'
      and policyname = 'scenario_tasks_delete_org_owner'
  ) then
    create policy scenario_tasks_delete_org_owner
      on public.scenario_tasks
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.scenarios s
          join public.organizations o on o.id = s.organization_id
          where s.id = scenario_tasks.scenario_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');

