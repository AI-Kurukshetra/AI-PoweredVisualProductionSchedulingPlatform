import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";
import type { ScenarioTask } from "./scenarios";
import { listMachinesByFacility } from "./machines";

type LiveTaskRow = {
  id: string;
  work_order_id: string;
  machine_id: string | null;
  start_time: string | null;
  end_time: string | null;
  work_orders?: { id: string; deadline: string | null; status: string } | null;
  machines?: { id: string; name: string; capacity: unknown } | null;
};

function n(value: unknown) {
  const num = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function overlapMinutes(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / (60 * 1000);
}

function isoDayUtc(ms: number) {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export type ScheduleMetrics = {
  scheduledHours: number;
  machineOverloadDays: number;
  lateWorkOrders: number;
  onTimeWorkOrders: number;
  onTimeRate: number;
  impactedWorkOrders: number;
};

function computeMetricsFromTasks(
  tasks: Array<{
    work_order_id: string;
    machine_id: string | null;
    start_time: string | null;
    end_time: string | null;
    deadline?: string | null;
    machine_capacity?: number;
  }>,
  input: { rangeStartMs: number; rangeEndMs: number }
): ScheduleMetrics {
  let scheduledMinutes = 0;

  const machineDayCounts = new Map<string, number>();
  const machineCapacity = new Map<string, number>();

  const completionByWorkOrder = new Map<string, number>();
  const deadlineByWorkOrder = new Map<string, number>();

  for (const t of tasks) {
    if (t.deadline) {
      const d = Date.parse(t.deadline);
      if (Number.isFinite(d)) deadlineByWorkOrder.set(t.work_order_id, d);
    }

    if (t.machine_id && typeof t.machine_capacity === "number") {
      machineCapacity.set(t.machine_id, t.machine_capacity);
    }

    if (!t.start_time || !t.end_time) continue;
    const a = Date.parse(t.start_time);
    const b = Date.parse(t.end_time);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue;
    const mins = overlapMinutes(a, b, input.rangeStartMs, input.rangeEndMs);
    if (mins <= 0) continue;
    scheduledMinutes += mins;

    const endInRange = Math.min(b, input.rangeEndMs);
    completionByWorkOrder.set(t.work_order_id, Math.max(completionByWorkOrder.get(t.work_order_id) ?? 0, endInRange));

    if (t.machine_id) {
      const day = isoDayUtc(a);
      const key = `${t.machine_id}:${day}`;
      machineDayCounts.set(key, (machineDayCounts.get(key) ?? 0) + 1);
    }
  }

  let overloadDays = 0;
  for (const [key, count] of machineDayCounts.entries()) {
    const machineId = key.split(":")[0] ?? "";
    const cap = machineCapacity.get(machineId) ?? 0;
    if (cap > 0 && count > cap) overloadDays += 1;
  }

  let onTime = 0;
  let late = 0;

  for (const [workOrderId, completion] of completionByWorkOrder.entries()) {
    const deadline = deadlineByWorkOrder.get(workOrderId);
    if (!deadline) continue;
    if (completion <= deadline) onTime += 1;
    else late += 1;
  }

  const denom = onTime + late;
  return {
    scheduledHours: scheduledMinutes / 60,
    machineOverloadDays: overloadDays,
    lateWorkOrders: late,
    onTimeWorkOrders: onTime,
    onTimeRate: denom ? onTime / denom : 0,
    impactedWorkOrders: completionByWorkOrder.size,
  };
}

export async function getLiveScheduleMetrics(
  supabase: SupabaseLikeClient,
  input: { organizationId: string; facilityId?: string | null; rangeStart: string; rangeEnd: string }
): Promise<ScheduleMetrics> {
  const rangeStartMs = Date.parse(input.rangeStart);
  const rangeEndMs = Date.parse(input.rangeEnd);
  const safeStart = Number.isFinite(rangeStartMs) ? rangeStartMs : Date.now() - 30 * 24 * 60 * 60 * 1000;
  const safeEnd = Number.isFinite(rangeEndMs) ? rangeEndMs : Date.now();

  let query = supabase
    .from("scheduling_tasks")
    .select(
      "id,work_order_id,machine_id,start_time,end_time,work_orders(id,deadline,status),machines(id,name,capacity),production_lines(id,facility_id)"
    )
    .not("start_time", "is", null)
    .not("end_time", "is", null)
    .eq("work_orders.organization_id", input.organizationId)
    .gte("start_time", input.rangeStart)
    .lte("start_time", input.rangeEnd)
    .order("start_time", { ascending: true });

  if (input.facilityId) query = query.eq("production_lines.facility_id", input.facilityId);

  const result = await query;
  const rows = requireData(result) as unknown as LiveTaskRow[];

  const tasks = rows.map((r) => ({
    work_order_id: r.work_order_id,
    machine_id: r.machine_id,
    start_time: r.start_time,
    end_time: r.end_time,
    deadline: r.work_orders?.deadline ?? null,
    machine_capacity: r.machine_id ? n(r.machines?.capacity) : 0,
  }));

  return computeMetricsFromTasks(tasks, { rangeStartMs: safeStart, rangeEndMs: safeEnd });
}

export async function getScenarioScheduleMetrics(
  supabase: SupabaseLikeClient,
  input: { scenarioTasks: ScenarioTask[]; facilityId?: string | null; rangeStart: string; rangeEnd: string }
): Promise<ScheduleMetrics> {
  const rangeStartMs = Date.parse(input.rangeStart);
  const rangeEndMs = Date.parse(input.rangeEnd);
  const safeStart = Number.isFinite(rangeStartMs) ? rangeStartMs : Date.now() - 30 * 24 * 60 * 60 * 1000;
  const safeEnd = Number.isFinite(rangeEndMs) ? rangeEndMs : Date.now();

  const facilityMachines = input.facilityId
    ? await listMachinesByFacility(supabase, input.facilityId).catch(() => [])
    : [];
  const capacityByMachine = new Map(facilityMachines.map((m) => [m.id, n(m.capacity)]));

  const tasks = input.scenarioTasks.map((t) => ({
    work_order_id: t.work_order_id,
    machine_id: t.machine_id,
    start_time: t.start_time,
    end_time: t.end_time,
    deadline: t.work_orders?.deadline ?? null,
    machine_capacity: t.machine_id ? (capacityByMachine.get(t.machine_id) ?? n(t.machines?.capacity)) : 0,
  }));

  return computeMetricsFromTasks(tasks, { rangeStartMs: safeStart, rangeEndMs: safeEnd });
}

