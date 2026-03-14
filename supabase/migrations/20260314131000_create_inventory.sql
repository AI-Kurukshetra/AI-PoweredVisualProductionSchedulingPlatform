-- Inventory module: suppliers, stock, transactions

create extension if not exists pgcrypto;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  contact text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists suppliers_organization_id_idx
  on public.suppliers (organization_id);

alter table public.suppliers enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'suppliers_select_org_owner'
  ) then
    create policy suppliers_select_org_owner
      on public.suppliers
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = suppliers.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'suppliers_insert_org_owner'
  ) then
    create policy suppliers_insert_org_owner
      on public.suppliers
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.organizations o
          where o.id = suppliers.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'suppliers_update_org_owner'
  ) then
    create policy suppliers_update_org_owner
      on public.suppliers
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = suppliers.organization_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.organizations o
          where o.id = suppliers.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'suppliers'
      and policyname = 'suppliers_delete_org_owner'
  ) then
    create policy suppliers_delete_org_owner
      on public.suppliers
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = suppliers.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

create table if not exists public.inventory_stock (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  on_hand numeric(14, 4) not null default 0,
  reserved numeric(14, 4) not null default 0,
  reorder_point numeric(14, 4) not null default 0,
  unit text not null default 'unit',
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, material_id),
  constraint inventory_stock_on_hand_nonneg check (on_hand >= 0),
  constraint inventory_stock_reserved_nonneg check (reserved >= 0)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'inventory_stock_set_updated_at'
  ) then
    create trigger inventory_stock_set_updated_at
      before update on public.inventory_stock
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists inventory_stock_facility_id_idx
  on public.inventory_stock (facility_id);

create index if not exists inventory_stock_material_id_idx
  on public.inventory_stock (material_id);

alter table public.inventory_stock enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inventory_stock'
      and policyname = 'inventory_stock_select_org_owner'
  ) then
    create policy inventory_stock_select_org_owner
      on public.inventory_stock
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = inventory_stock.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inventory_stock'
      and policyname = 'inventory_stock_insert_org_owner'
  ) then
    create policy inventory_stock_insert_org_owner
      on public.inventory_stock
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = inventory_stock.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inventory_stock'
      and policyname = 'inventory_stock_update_org_owner'
  ) then
    create policy inventory_stock_update_org_owner
      on public.inventory_stock
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = inventory_stock.facility_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = inventory_stock.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'inventory_stock'
      and policyname = 'inventory_stock_delete_org_owner'
  ) then
    create policy inventory_stock_delete_org_owner
      on public.inventory_stock
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = inventory_stock.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

create table if not exists public.material_transactions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  txn_type text not null,
  quantity numeric(14, 4) not null,
  unit text not null,
  reference text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

create index if not exists material_transactions_facility_id_idx
  on public.material_transactions (facility_id);

create index if not exists material_transactions_material_id_idx
  on public.material_transactions (material_id);

create index if not exists material_transactions_created_at_idx
  on public.material_transactions (created_at);

alter table public.material_transactions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'material_transactions'
      and policyname = 'material_transactions_select_org_owner'
  ) then
    create policy material_transactions_select_org_owner
      on public.material_transactions
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = material_transactions.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'material_transactions'
      and policyname = 'material_transactions_insert_org_owner'
  ) then
    create policy material_transactions_insert_org_owner
      on public.material_transactions
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.facilities f
          join public.organizations o on o.id = f.organization_id
          where f.id = material_transactions.facility_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'material_transactions'
      and policyname = 'material_transactions_update_org_owner'
  ) then
    create policy material_transactions_update_org_owner
      on public.material_transactions
      for update
      to authenticated
      using (false)
      with check (false);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'material_transactions'
      and policyname = 'material_transactions_delete_org_owner'
  ) then
    create policy material_transactions_delete_org_owner
      on public.material_transactions
      for delete
      to authenticated
      using (false);
  end if;
end $$;

create or replace function public.apply_material_transaction(
  p_facility_id uuid,
  p_material_id uuid,
  p_supplier_id uuid,
  p_txn_type text,
  p_quantity numeric,
  p_unit text,
  p_reference text default null
)
returns public.material_transactions
language plpgsql
as $$
declare
  v_delta numeric;
  v_current numeric;
  v_tx public.material_transactions;
begin
  if p_txn_type not in ('receipt','issue','adjustment') then
    raise exception 'Invalid txn_type: %', p_txn_type;
  end if;

  if p_quantity is null then
    raise exception 'Quantity is required';
  end if;

  if p_txn_type in ('receipt','issue') and p_quantity <= 0 then
    raise exception 'Quantity must be > 0 for %', p_txn_type;
  end if;

  if p_unit is null or length(trim(p_unit)) = 0 then
    raise exception 'Unit is required';
  end if;

  if p_txn_type = 'receipt' then
    v_delta := p_quantity;
  elsif p_txn_type = 'issue' then
    v_delta := -p_quantity;
  else
    -- adjustment may be positive or negative
    v_delta := p_quantity;
  end if;

  select coalesce(on_hand, 0)
    into v_current
  from public.inventory_stock
  where facility_id = p_facility_id
    and material_id = p_material_id
  for update;

  if (coalesce(v_current, 0) + v_delta) < 0 then
    raise exception
      using
        errcode = 'P0001',
        message = format(
          'Insufficient stock for issue/adjustment (on_hand=%.4f, delta=%.4f, resulting=%.4f)',
          coalesce(v_current, 0),
          v_delta,
          coalesce(v_current, 0) + v_delta
        );
  end if;

  insert into public.material_transactions (
    facility_id,
    material_id,
    supplier_id,
    txn_type,
    quantity,
    unit,
    reference
  ) values (
    p_facility_id,
    p_material_id,
    p_supplier_id,
    p_txn_type,
    p_quantity,
    p_unit,
    p_reference
  ) returning * into v_tx;

  insert into public.inventory_stock (
    facility_id,
    material_id,
    on_hand,
    reserved,
    reorder_point,
    unit
  ) values (
    p_facility_id,
    p_material_id,
    greatest(coalesce(v_current, 0) + v_delta, 0),
    0,
    0,
    p_unit
  )
  on conflict (facility_id, material_id)
  do update set
    on_hand = greatest(public.inventory_stock.on_hand + v_delta, 0),
    unit = excluded.unit,
    updated_at = now();

  return v_tx;
end;
$$;
