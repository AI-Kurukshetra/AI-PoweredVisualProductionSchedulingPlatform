-- Enable Supabase Realtime for production monitoring dashboard.
-- Subscribing to work_orders, operations, and scheduling_tasks gives live
-- updates for active work orders, machine/worker assignments, and schedule progress.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'work_orders') then
      alter publication supabase_realtime add table public.work_orders;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'operations') then
      alter publication supabase_realtime add table public.operations;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'scheduling_tasks') then
      alter publication supabase_realtime add table public.scheduling_tasks;
    end if;
  end if;
end $$;
