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

