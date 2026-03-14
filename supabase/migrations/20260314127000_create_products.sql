-- Products belong to organizations

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  sku text,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

