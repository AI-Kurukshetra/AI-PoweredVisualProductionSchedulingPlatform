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

