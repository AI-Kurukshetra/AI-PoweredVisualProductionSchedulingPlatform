-- Create calendar tables for VizPlan scheduling insights
-- Includes shifts, holidays, maintenance windows, and assignments

create extension if not exists pgcrypto;

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  days_of_week text[] not null default array[]::text[],
  start_time time not null,
  end_time time not null,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shifts_organization_id_idx
  on public.shifts (organization_id);

create index if not exists shifts_created_at_idx
  on public.shifts (created_at);

alter table public.shifts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shifts'
      and policyname = 'shifts_select_own'
  ) then
    create policy shifts_select_own
      on public.shifts
      for select
      to authenticated
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shifts'
      and policyname = 'shifts_insert_own'
  ) then
    create policy shifts_insert_own
      on public.shifts
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shifts'
      and policyname = 'shifts_update_own'
  ) then
    create policy shifts_update_own
      on public.shifts
      for update
      to authenticated
      using (created_by = auth.uid())
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shifts'
      and policyname = 'shifts_delete_own'
  ) then
    create policy shifts_delete_own
      on public.shifts
      for delete
      to authenticated
      using (created_by = auth.uid());
  end if;
end $$;

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  date date not null,
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create unique index if not exists holidays_organization_date_idx
  on public.holidays (organization_id, date);

create index if not exists holidays_created_at_idx
  on public.holidays (created_at);

alter table public.holidays enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'holidays'
      and policyname = 'holidays_select_own'
  ) then
    create policy holidays_select_own
      on public.holidays
      for select
      to authenticated
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'holidays'
      and policyname = 'holidays_insert_own'
  ) then
    create policy holidays_insert_own
      on public.holidays
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'holidays'
      and policyname = 'holidays_update_own'
  ) then
    create policy holidays_update_own
      on public.holidays
      for update
      to authenticated
      using (created_by = auth.uid())
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'holidays'
      and policyname = 'holidays_delete_own'
  ) then
    create policy holidays_delete_own
      on public.holidays
      for delete
      to authenticated
      using (created_by = auth.uid());
  end if;
end $$;

create table if not exists public.maintenance_windows (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  description text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_machine_idx
  on public.maintenance_windows (machine_id);

create index if not exists maintenance_start_time_idx
  on public.maintenance_windows (start_time);

create index if not exists maintenance_end_time_idx
  on public.maintenance_windows (end_time);

alter table public.maintenance_windows enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'maintenance_windows'
      and policyname = 'maintenance_select_own'
  ) then
    create policy maintenance_select_own
      on public.maintenance_windows
      for select
      to authenticated
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'maintenance_windows'
      and policyname = 'maintenance_insert_own'
  ) then
    create policy maintenance_insert_own
      on public.maintenance_windows
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'maintenance_windows'
      and policyname = 'maintenance_update_own'
  ) then
    create policy maintenance_update_own
      on public.maintenance_windows
      for update
      to authenticated
      using (created_by = auth.uid())
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'maintenance_windows'
      and policyname = 'maintenance_delete_own'
  ) then
    create policy maintenance_delete_own
      on public.maintenance_windows
      for delete
      to authenticated
      using (created_by = auth.uid());
  end if;
end $$;

create table if not exists public.machine_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists machine_shift_machine_idx
  on public.machine_shift_assignments (machine_id);

create index if not exists machine_shift_shift_idx
  on public.machine_shift_assignments (shift_id);

alter table public.machine_shift_assignments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'machine_shift_assignments'
      and policyname = 'machine_shift_select_own'
  ) then
    create policy machine_shift_select_own
      on public.machine_shift_assignments
      for select
      to authenticated
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'machine_shift_assignments'
      and policyname = 'machine_shift_insert_own'
  ) then
    create policy machine_shift_insert_own
      on public.machine_shift_assignments
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'machine_shift_assignments'
      and policyname = 'machine_shift_delete_own'
  ) then
    create policy machine_shift_delete_own
      on public.machine_shift_assignments
      for delete
      to authenticated
      using (created_by = auth.uid());
  end if;
end $$;

create table if not exists public.worker_shift_assignments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id) on delete cascade,
  shift_id uuid not null references public.shifts (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists worker_shift_worker_idx
  on public.worker_shift_assignments (worker_id);

create index if not exists worker_shift_shift_idx
  on public.worker_shift_assignments (shift_id);

alter table public.worker_shift_assignments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_shift_assignments'
      and policyname = 'worker_shift_select_own'
  ) then
    create policy worker_shift_select_own
      on public.worker_shift_assignments
      for select
      to authenticated
      using (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_shift_assignments'
      and policyname = 'worker_shift_insert_own'
  ) then
    create policy worker_shift_insert_own
      on public.worker_shift_assignments
      for insert
      to authenticated
      with check (created_by = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'worker_shift_assignments'
      and policyname = 'worker_shift_delete_own'
  ) then
    create policy worker_shift_delete_own
      on public.worker_shift_assignments
      for delete
      to authenticated
      using (created_by = auth.uid());
  end if;
end $$;
