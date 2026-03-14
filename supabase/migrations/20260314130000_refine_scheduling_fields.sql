-- Refine scheduling fields for machines, workers, and products

alter table public.machines
  add column if not exists setup_time integer not null default 0;

alter table public.workers
  add column if not exists shift_availability text not null default 'any';

alter table public.products
  add column if not exists default_production_time integer not null default 0;

