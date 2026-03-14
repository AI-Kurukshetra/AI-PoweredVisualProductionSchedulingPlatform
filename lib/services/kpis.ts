import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";
import { listMachinesByFacility } from "./machines";
import { listWorkOrders } from "./work-orders";

type KpiRange = {
  startMs: number;
  endMs: number;
  startIso: string;
  endIso: string;
  days: number;
};

export type KpiDashboardData = {
  range: { start: string; end: string; days: number };
  summary: {
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    avgMachineUtilization: number;
    onTimeDelivery: number;
    throughputPerDay: number;
    completedWorkOrders: number;
    totalWorkOrders: number;
    completionRate: number;
    scheduledHours: number;
  };
  charts: {
    throughputDaily: { date: string; completed: number }[];
    utilizationByMachine: { machineId: string; machineName: string; utilization: number; scheduledHours: number }[];
    workOrderStatus: { status: string; count: number }[];
  };
  notes: string[];
};

function n(value: unknown) {
  const num = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
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

function computeRange(days: number): KpiRange {
  const endMs = Date.now();
  const startMs = endMs - days * 24 * 60 * 60 * 1000;
  return {
    startMs,
    endMs,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
    days,
  };
}

type TaskRow = {
  id: string;
  work_order_id: string;
  machine_id: string | null;
  start_time: string | null;
  end_time: string | null;
  machines?: { id: string; name: string } | null;
  work_orders?: {
    id: string;
    product_id: string;
    quantity: unknown;
    products?: { id: string; name: string; default_production_time: unknown } | null;
  } | null;
};

export async function getKpiDashboardData(
  supabase: SupabaseLikeClient,
  input: { organizationId: string; facilityId?: string; rangeDays: number }
): Promise<KpiDashboardData> {
  const range = computeRange(input.rangeDays);
  const notes: string[] = [];

  const workOrders = await listWorkOrders(supabase, { organizationId: input.organizationId });

  const statusCounts = workOrders.reduce<Record<string, number>>((acc, wo) => {
    acc[wo.status] = (acc[wo.status] ?? 0) + 1;
    return acc;
  }, {});

  const totalWorkOrders = workOrders.length;

  const completedInRange = workOrders.filter((wo) => {
    if (wo.status !== "completed") return false;
    const t = Date.parse(wo.updated_at);
    return Number.isFinite(t) && t >= range.startMs && t <= range.endMs;
  });

  const completedWorkOrders = completedInRange.length;

  const completedWithDeadline = completedInRange.filter((wo) => Boolean(wo.deadline));
  const onTimeCount = completedWithDeadline.filter((wo) => {
    const done = Date.parse(wo.updated_at);
    const deadline = wo.deadline ? Date.parse(wo.deadline) : 0;
    return Number.isFinite(done) && Number.isFinite(deadline) && done <= deadline;
  }).length;

  const onTimeDelivery =
    completedWithDeadline.length > 0 ? onTimeCount / completedWithDeadline.length : 0;

  const throughputPerDay =
    input.rangeDays > 0 ? completedWorkOrders / input.rangeDays : 0;

  const throughputDailyMap = new Map<string, number>();
  for (const wo of completedInRange) {
    const t = Date.parse(wo.updated_at);
    if (!Number.isFinite(t)) continue;
    const day = isoDayUtc(t);
    throughputDailyMap.set(day, (throughputDailyMap.get(day) ?? 0) + 1);
  }
  const throughputDaily = Array.from(throughputDailyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, completed]) => ({ date, completed }));

  // Scheduling-based metrics (utilization and OEE proxy).
  let tasks: TaskRow[] = [];
  try {
    let query = supabase
      .from("scheduling_tasks")
      .select(
        "id,work_order_id,machine_id,start_time,end_time,machines(id,name),work_orders(id,product_id,quantity,products(id,name,default_production_time)),production_lines(id,facility_id)"
      )
      .not("start_time", "is", null)
      .not("end_time", "is", null)
      .eq("work_orders.organization_id", input.organizationId)
      .gte("start_time", range.startIso)
      .lte("start_time", range.endIso)
      .order("start_time", { ascending: true });

    if (input.facilityId) {
      query = query.eq("production_lines.facility_id", input.facilityId);
    }

    const result = await query;
    tasks = requireData(result) as unknown as TaskRow[];
  } catch {
    notes.push("Scheduling data unavailable; utilization/OEE may be zero.");
  }

  const machines = input.facilityId
    ? await listMachinesByFacility(supabase, input.facilityId).catch(() => [])
    : [];

  const machineIdToName = new Map<string, string>();
  for (const m of machines) machineIdToName.set(m.id, m.name);
  for (const t of tasks) {
    if (t.machine_id && t.machines?.name) {
      machineIdToName.set(t.machine_id, t.machines.name);
    }
  }

  const scheduledMinutesByMachine = new Map<string, number>();
  const scheduledWorkOrderIds = new Set<string>();
  let scheduledMinutesTotal = 0;

  for (const t of tasks) {
    if (!t.start_time || !t.end_time) continue;
    const a = Date.parse(t.start_time);
    const b = Date.parse(t.end_time);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue;
    const mins = overlapMinutes(a, b, range.startMs, range.endMs);
    if (mins <= 0) continue;
    scheduledMinutesTotal += mins;
    scheduledWorkOrderIds.add(t.work_order_id);
    if (t.machine_id) {
      scheduledMinutesByMachine.set(
        t.machine_id,
        (scheduledMinutesByMachine.get(t.machine_id) ?? 0) + mins
      );
    }
  }

  const machineIds = machines.length
    ? machines.map((m) => m.id)
    : Array.from(scheduledMinutesByMachine.keys());

  // Optional: subtract maintenance windows from available time if calendar tables exist.
  const maintenanceMinutesByMachine = new Map<string, number>();
  if (machineIds.length) {
    try {
      const maintResult = await supabase
        .from("maintenance_windows")
        .select("machine_id,start_time,end_time")
        .in("machine_id", machineIds)
        .gte("start_time", range.startIso)
        .lte("start_time", range.endIso);
      const maint = requireData(maintResult) as unknown as Array<{
        machine_id: string;
        start_time: string;
        end_time: string;
      }>;
      for (const m of maint) {
        const a = Date.parse(m.start_time);
        const b = Date.parse(m.end_time);
        const mins = overlapMinutes(a, b, range.startMs, range.endMs);
        if (mins <= 0) continue;
        maintenanceMinutesByMachine.set(
          m.machine_id,
          (maintenanceMinutesByMachine.get(m.machine_id) ?? 0) + mins
        );
      }
    } catch {
      // Calendar tables may not be deployed; ignore.
    }
  }

  const totalRangeMinutes = input.rangeDays * 24 * 60;
  const availableMinutesTotal = machineIds.reduce((acc, id) => {
    const maint = maintenanceMinutesByMachine.get(id) ?? 0;
    return acc + Math.max(0, totalRangeMinutes - maint);
  }, 0);

  const avgMachineUtilization =
    availableMinutesTotal > 0 ? scheduledMinutesTotal / availableMinutesTotal : 0;

  const utilizationByMachine = machineIds
    .map((id) => {
      const scheduled = scheduledMinutesByMachine.get(id) ?? 0;
      const maint = maintenanceMinutesByMachine.get(id) ?? 0;
      const available = Math.max(1, totalRangeMinutes - maint);
      return {
        machineId: id,
        machineName: machineIdToName.get(id) ?? "Machine",
        utilization: clamp01(scheduled / available),
        scheduledHours: scheduled / 60,
      };
    })
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 12);

  // OEE proxy:
  // Availability: avg utilization (scheduled/available).
  const availability = clamp01(avgMachineUtilization);

  // Performance proxy: expected minutes from product default time vs scheduled minutes.
  // (Crude: counts each work order once if it has any scheduled task in range.)
  const scheduledWorkOrders = workOrders.filter((wo) => scheduledWorkOrderIds.has(wo.id));
  const expectedMinutes = scheduledWorkOrders.reduce((acc, wo) => {
    const qty = n(wo.quantity);
    const perUnit = n((wo.products as unknown as { default_production_time?: unknown } | null)?.default_production_time);
    return acc + Math.max(0, qty * perUnit);
  }, 0);
  const performance = scheduledMinutesTotal > 0 ? clamp01(expectedMinutes / scheduledMinutesTotal) : 0;

  // Quality proxy: no scrap/defect data available.
  const quality = 1;

  const oee = clamp01(availability * performance * quality);

  if (!expectedMinutes) {
    notes.push("OEE performance is a proxy; set product default production time for better accuracy.");
  } else {
    notes.push("OEE is computed as Availability x Performance x Quality (quality assumed 100%).");
  }

  const completionRate = totalWorkOrders > 0 ? completedWorkOrders / totalWorkOrders : 0;

  return {
    range: { start: range.startIso, end: range.endIso, days: range.days },
    summary: {
      oee,
      availability,
      performance,
      quality,
      avgMachineUtilization: clamp01(avgMachineUtilization),
      onTimeDelivery: clamp01(onTimeDelivery),
      throughputPerDay,
      completedWorkOrders,
      totalWorkOrders,
      completionRate: clamp01(completionRate),
      scheduledHours: scheduledMinutesTotal / 60,
    },
    charts: {
      throughputDaily,
      utilizationByMachine,
      workOrderStatus: Object.entries(statusCounts)
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => b.count - a.count),
    },
    notes,
  };
}
