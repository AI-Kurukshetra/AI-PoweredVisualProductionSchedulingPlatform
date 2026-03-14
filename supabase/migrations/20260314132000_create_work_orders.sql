-- Work orders, operations, and scheduling tasks

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity numeric(14, 4) not null default 1,
  priority integer not null default 3,
  deadline timestamptz,
  status text not null default 'planned',
  dependency_ids uuid[] not null default '{}'::uuid[],
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_orders_quantity_nonneg check (quantity >= 0)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'work_orders_set_updated_at'
  ) then
    create trigger work_orders_set_updated_at
      before update on public.work_orders
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists work_orders_organization_id_idx
  on public.work_orders (organization_id);

create index if not exists work_orders_product_id_idx
  on public.work_orders (product_id);

create index if not exists work_orders_status_idx
  on public.work_orders (status);

create index if not exists work_orders_deadline_idx
  on public.work_orders (deadline);

alter table public.work_orders enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'work_orders'
      and policyname = 'work_orders_select_org_owner'
  ) then
    create policy work_orders_select_org_owner
      on public.work_orders
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = work_orders.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'work_orders'
      and policyname = 'work_orders_insert_org_owner'
  ) then
    create policy work_orders_insert_org_owner
      on public.work_orders
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.organizations o
          where o.id = work_orders.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'work_orders'
      and policyname = 'work_orders_update_org_owner'
  ) then
    create policy work_orders_update_org_owner
      on public.work_orders
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = work_orders.organization_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.organizations o
          where o.id = work_orders.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'work_orders'
      and policyname = 'work_orders_delete_org_owner'
  ) then
    create policy work_orders_delete_org_owner
      on public.work_orders
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = work_orders.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

create table if not exists public.operations (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  production_line_id uuid references public.production_lines (id) on delete set null,
  machine_id uuid references public.machines (id) on delete set null,
  worker_id uuid references public.workers (id) on delete set null,
  name text not null,
  sequence integer not null default 1,
  quantity numeric(14, 4) not null default 1,
  priority integer not null default 3,
  deadline timestamptz,
  status text not null default 'pending',
  dependency_ids uuid[] not null default '{}'::uuid[],
  planned_start timestamptz,
  planned_end timestamptz,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint operations_quantity_nonneg check (quantity >= 0),
  unique (work_order_id, sequence)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'operations_set_updated_at'
  ) then
    create trigger operations_set_updated_at
      before update on public.operations
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists operations_work_order_id_idx
  on public.operations (work_order_id);

create index if not exists operations_production_line_id_idx
  on public.operations (production_line_id);

create index if not exists operations_machine_id_idx
  on public.operations (machine_id);

create index if not exists operations_worker_id_idx
  on public.operations (worker_id);

create index if not exists operations_status_idx
  on public.operations (status);

alter table public.operations enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'operations'
      and policyname = 'operations_select_org_owner'
  ) then
    create policy operations_select_org_owner
      on public.operations
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.work_orders w
          join public.organizations o on o.id = w.organization_id
          where w.id = operations.work_order_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'operations'
      and policyname = 'operations_insert_org_owner'
  ) then
    create policy operations_insert_org_owner
      on public.operations
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.work_orders w
          join public.organizations o on o.id = w.organization_id
          where w.id = operations.work_order_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'operations'
      and policyname = 'operations_update_org_owner'
  ) then
    create policy operations_update_org_owner
      on public.operations
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.work_orders w
          join public.organizations o on o.id = w.organization_id
          where w.id = operations.work_order_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.work_orders w
          join public.organizations o on o.id = w.organization_id
          where w.id = operations.work_order_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'operations'
      and policyname = 'operations_delete_org_owner'
  ) then
    create policy operations_delete_org_owner
      on public.operations
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.work_orders w
          join public.organizations o on o.id = w.organization_id
          where w.id = operations.work_order_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

create table if not exists public.scheduling_tasks (
  id uuid primary key default gen_random_uuid(),
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
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'scheduling_tasks_set_updated_at'
  ) then
    create trigger scheduling_tasks_set_updated_at
      before update on public.scheduling_tasks
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists scheduling_tasks_work_order_id_idx
  on public.scheduling_tasks (work_order_id);

create index if not exists scheduling_tasks_operation_id_idx
  on public.scheduling_tasks (operation_id);

create index if not exists scheduling_tasks_production_line_id_idx
  on public.scheduling_tasks (production_line_id);

create index if not exists scheduling_tasks_machine_id_idx
  on public.scheduling_tasks (machine_id);

create index if not exists scheduling_tasks_worker_id_idx
  on public.scheduling_tasks (worker_id);

create index if not exists scheduling_tasks_start_time_idx
  on public.scheduling_tasks (start_time);

alter table public.scheduling_tasks enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scheduling_tasks'
      and policyname = 'scheduling_tasks_select_org_owner'
  ) then
    create policy scheduling_tasks_select_org_owner
      on public.scheduling_tasks
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.work_orders w
          join public.organizations o on o.id = w.organization_id
          where w.id = scheduling_tasks.work_order_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scheduling_tasks'
      and policyname = 'scheduling_tasks_insert_org_owner'
  ) then
    create policy scheduling_tasks_insert_org_owner
      on public.scheduling_tasks
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.work_orders w
          join public.organizations o on o.id = w.organization_id
          where w.id = scheduling_tasks.work_order_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scheduling_tasks'
      and policyname = 'scheduling_tasks_update_org_owner'
  ) then
    create policy scheduling_tasks_update_org_owner
      on public.scheduling_tasks
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.work_orders w
          join public.organizations o on o.id = w.organization_id
          where w.id = scheduling_tasks.work_order_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.work_orders w
          join public.organizations o on o.id = w.organization_id
          where w.id = scheduling_tasks.work_order_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scheduling_tasks'
      and policyname = 'scheduling_tasks_delete_org_owner'
  ) then
    create policy scheduling_tasks_delete_org_owner
      on public.scheduling_tasks
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.work_orders w
          join public.organizations o on o.id = w.organization_id
          where w.id = scheduling_tasks.work_order_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;
