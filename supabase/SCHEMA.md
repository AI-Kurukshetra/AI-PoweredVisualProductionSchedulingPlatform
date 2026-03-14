# Supabase Schema Map (by module)

This repo contains multiple modules. This document maps UI modules to the tables they use so it is easier to understand what is required.

## Core scheduling (recommended)

- `organizations`
- `facilities`
- `production_lines`
- `machines`
- `workers`
- `products`
- `work_orders`
- `operations`
- `scheduling_tasks`

These tables power:

- `/dashboard/*` foundation/resources/products
- `/dashboard/work-orders`, `/dashboard/operations`, `/dashboard/scheduling`, `/dashboard/scheduling/visual`

## Inventory + BOM

- `materials`
- `suppliers`
- `inventory_stock`
- `material_transactions`
- `bill_of_materials`
- `apply_material_transaction(...)` Postgres function

These tables power:

- `/dashboard/inventory`
- `/dashboard/bom`

## Calendar

- `shifts`
- `holidays`
- `maintenance_windows`
- `machine_shift_assignments`
- `worker_shift_assignments`

These tables power:

- `/dashboard/calendar/*`

## Exception management

- `alerts`

These tables power:

- `/dashboard/exceptions`

## Scenario planning

- `scenarios`
- `scenario_tasks`

These tables power:

- `/dashboard/scenarios/*`

## KPI dashboard

Reads from:

- `work_orders`
- `scheduling_tasks`
- `machines`

Optional enhancement:

- `maintenance_windows` (if Calendar is enabled, available time excludes maintenance)

These views power:

- `/dashboard/kpi`

## Monitoring

Reads from:

- `work_orders`
- `scheduling_tasks`
- `operations`

These views power:

- `/dashboard/monitoring`

