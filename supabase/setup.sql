-- Paste this entire file into Supabase Dashboard → SQL Editor and run.
-- Creates: organizations → facilities → production_lines, plus RLS policies and indexes.
-- Then reloads the PostgREST schema cache.

-- ========== organizations ==========
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

-- ========== facilities ==========
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

-- ========== production_lines ==========
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

-- ========== machines ==========
-- Machines belong to production lines

create extension if not exists pgcrypto;

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  production_line_id uuid not null references public.production_lines (id) on delete cascade,
  name text not null,
  type text,
  status text not null default 'active',
  capacity integer not null default 0,
  setup_time integer not null default 0,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.machines
  add column if not exists setup_time integer not null default 0;

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

-- ========== workers ==========
-- Workers belong to facilities

create extension if not exists pgcrypto;

create table if not exists public.workers (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  name text not null,
  role text,
  skills text,
  shift_availability text not null default 'any',
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now()
);

alter table public.workers
  add column if not exists shift_availability text not null default 'any';

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

-- ========== products ==========
-- Products belong to organizations

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  sku text,
  default_production_time integer not null default 0,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists default_production_time integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'products_set_updated_at'
  ) then
    create trigger products_set_updated_at
      before update on public.products
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists products_organization_id_idx
  on public.products (organization_id);

create index if not exists products_created_at_idx
  on public.products (created_at);

alter table public.products enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'products_select_org_owner'
  ) then
    create policy products_select_org_owner
      on public.products
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = products.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'products_insert_org_owner'
  ) then
    create policy products_insert_org_owner
      on public.products
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.organizations o
          where o.id = products.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'products_update_org_owner'
  ) then
    create policy products_update_org_owner
      on public.products
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = products.organization_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.organizations o
          where o.id = products.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'products_delete_org_owner'
  ) then
    create policy products_delete_org_owner
      on public.products
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = products.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

-- ========== materials ==========
-- Materials belong to organizations

create extension if not exists pgcrypto;

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  code text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'materials_set_updated_at'
  ) then
    create trigger materials_set_updated_at
      before update on public.materials
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists materials_organization_id_idx
  on public.materials (organization_id);

create index if not exists materials_created_at_idx
  on public.materials (created_at);

alter table public.materials enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'materials'
      and policyname = 'materials_select_org_owner'
  ) then
    create policy materials_select_org_owner
      on public.materials
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = materials.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'materials'
      and policyname = 'materials_insert_org_owner'
  ) then
    create policy materials_insert_org_owner
      on public.materials
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.organizations o
          where o.id = materials.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'materials'
      and policyname = 'materials_update_org_owner'
  ) then
    create policy materials_update_org_owner
      on public.materials
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = materials.organization_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.organizations o
          where o.id = materials.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'materials'
      and policyname = 'materials_delete_org_owner'
  ) then
    create policy materials_delete_org_owner
      on public.materials
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.organizations o
          where o.id = materials.organization_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

-- ========== bill_of_materials ==========
-- Bill of Materials: links products and materials

create extension if not exists pgcrypto;

create table if not exists public.bill_of_materials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete restrict,
  quantity numeric(14, 4) not null,
  unit text not null,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, material_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'bill_of_materials_set_updated_at'
  ) then
    create trigger bill_of_materials_set_updated_at
      before update on public.bill_of_materials
      for each row
      execute function public.set_updated_at();
  end if;
end $$;

create index if not exists bill_of_materials_product_id_idx
  on public.bill_of_materials (product_id);

create index if not exists bill_of_materials_material_id_idx
  on public.bill_of_materials (material_id);

alter table public.bill_of_materials enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bill_of_materials'
      and policyname = 'bom_select_org_owner'
  ) then
    create policy bom_select_org_owner
      on public.bill_of_materials
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.products p
          join public.organizations o on o.id = p.organization_id
          where p.id = bill_of_materials.product_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bill_of_materials'
      and policyname = 'bom_insert_org_owner'
  ) then
    create policy bom_insert_org_owner
      on public.bill_of_materials
      for insert
      to authenticated
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.products p
          join public.organizations o on o.id = p.organization_id
          where p.id = bill_of_materials.product_id
            and o.created_by = auth.uid()
        )
        and exists (
          select 1
          from public.materials m
          join public.organizations o on o.id = m.organization_id
          where m.id = bill_of_materials.material_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bill_of_materials'
      and policyname = 'bom_update_org_owner'
  ) then
    create policy bom_update_org_owner
      on public.bill_of_materials
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.products p
          join public.organizations o on o.id = p.organization_id
          where p.id = bill_of_materials.product_id
            and o.created_by = auth.uid()
        )
      )
      with check (
        created_by = auth.uid()
        and exists (
          select 1
          from public.products p
          join public.organizations o on o.id = p.organization_id
          where p.id = bill_of_materials.product_id
            and o.created_by = auth.uid()
        )
        and exists (
          select 1
          from public.materials m
          join public.organizations o on o.id = m.organization_id
          where m.id = bill_of_materials.material_id
            and o.created_by = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bill_of_materials'
      and policyname = 'bom_delete_org_owner'
  ) then
    create policy bom_delete_org_owner
      on public.bill_of_materials
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.products p
          join public.organizations o on o.id = p.organization_id
          where p.id = bill_of_materials.product_id
            and o.created_by = auth.uid()
        )
      );
  end if;
end $$;

-- ========== inventory (suppliers, stock, transactions) ==========

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
    v_delta := p_quantity;
  end if;

  select coalesce(on_hand, 0)
    into v_current
  from public.inventory_stock
  where facility_id = p_facility_id
    and material_id = p_material_id
  for update;

  if (coalesce(v_current, 0) + v_delta) < 0 then
    raise exception 'Insufficient stock for issue/adjustment';
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

-- ========== work orders, operations, scheduling tasks ==========

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

-- ========== calendar ==========
-- Shifts, holidays, maintenance windows, and shift assignments

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

-- ========== reload schema cache ==========
select pg_notify('pgrst', 'reload schema');
