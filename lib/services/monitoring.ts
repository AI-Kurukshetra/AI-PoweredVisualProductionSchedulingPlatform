import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";
import { listWorkOrders, type WorkOrderWithProduct } from "./work-orders";
import type { SchedulingTaskWithRefs } from "./scheduling-tasks";

const TASK_SELECT =
  "id,work_order_id,operation_id,production_line_id,machine_id,worker_id,start_time,end_time,status,notes,created_by,created_at,updated_at,work_orders(id),operations(id,name),production_lines(id,name),machines(id,name),workers(id,name)";

export type MachineUtilization = {
  machineId: string;
  machineName: string;
  taskCount: number;
  totalMinutes: number;
  statuses: Record<string, number>;
};

export type WorkerActivity = {
  workerId: string;
  workerName: string;
  taskCount: number;
  currentTask: SchedulingTaskWithRefs | null;
  statuses: Record<string, number>;
};

export type DelayedItem = {
  type: "work_order" | "task";
  id: string;
  label: string;
  deadlineOrEnd: string;
  status: string;
  workOrderId?: string;
  productName?: string;
};

export type MonitoringData = {
  workOrders: WorkOrderWithProduct[];
  tasks: SchedulingTaskWithRefs[];
  machineUtilization: MachineUtilization[];
  workerActivity: WorkerActivity[];
  delayedWorkOrders: DelayedItem[];
  delayedTasks: DelayedItem[];
  kpis: {
    activeWorkOrderCount: number;
    inProgressTaskCount: number;
    delayedCount: number;
    machinesInUseCount: number;
    workersActiveCount: number;
  };
};

const ACTIVE_WO_STATUSES = ["planned", "in_progress", "scheduled", "released"];
const COMPLETED_TASK_STATUSES = ["completed", "cancelled"];

function parseIso(s: string | null): number {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

function durationMinutes(start: string | null, end: string | null): number {
  const a = parseIso(start);
  const b = parseIso(end);
  if (!a || !b || b <= a) return 0;
  return (b - a) / (60 * 1000);
}

export async function getMonitoringData(
  supabase: SupabaseLikeClient,
  input: { organizationId: string }
): Promise<MonitoringData> {
  const workOrders = await listWorkOrders(supabase, { organizationId: input.organizationId });
  const activeWorkOrders = workOrders.filter((wo) =>
    ACTIVE_WO_STATUSES.includes(wo.status)
  );
  const workOrderIds = activeWorkOrders.map((wo) => wo.id);
  if (workOrderIds.length === 0) {
    return {
      workOrders: activeWorkOrders,
      tasks: [],
      machineUtilization: [],
      workerActivity: [],
      delayedWorkOrders: [],
      delayedTasks: [],
      kpis: {
        activeWorkOrderCount: 0,
        inProgressTaskCount: 0,
        delayedCount: 0,
        machinesInUseCount: 0,
        workersActiveCount: 0,
      },
    };
  }

  const result = await supabase
    .from("scheduling_tasks")
    .select(TASK_SELECT)
    .in("work_order_id", workOrderIds)
    .order("start_time", { ascending: true });
  const tasks = (requireData(result) as unknown as SchedulingTaskWithRefs[]) ?? [];

  const now = Date.now();
  const machineMap = new Map<
    string,
    { name: string; taskCount: number; totalMinutes: number; statuses: Record<string, number> }
  >();
  const workerMap = new Map<
    string,
    { name: string; taskCount: number; statuses: Record<string, number>; tasks: SchedulingTaskWithRefs[] }
  >();
  const delayedTasks: DelayedItem[] = [];
  let inProgressCount = 0;

  for (const task of tasks) {
    const status = task.status ?? "scheduled";
    if (!COMPLETED_TASK_STATUSES.includes(status)) {
      inProgressCount += 1;
    }

    const endTime = task.end_time ? parseIso(task.end_time) : 0;
    if (endTime > 0 && endTime < now && !COMPLETED_TASK_STATUSES.includes(status)) {
      delayedTasks.push({
        type: "task",
        id: task.id,
        label: task.operations?.name ?? "Task",
        deadlineOrEnd: task.end_time!,
        status,
        workOrderId: task.work_order_id,
        productName: undefined,
      });
    }

    if (task.machine_id) {
      const name = (task.machines as { name?: string } | null)?.name ?? "Unknown machine";
      const existing = machineMap.get(task.machine_id);
      const mins = durationMinutes(task.start_time, task.end_time);
      const count = existing ? existing.taskCount + 1 : 1;
      const totalMin = existing ? existing.totalMinutes + mins : mins;
      const statuses = existing ? { ...existing.statuses } : {} as Record<string, number>;
      statuses[status] = (statuses[status] ?? 0) + 1;
      machineMap.set(task.machine_id, { name, taskCount: count, totalMinutes: totalMin, statuses });
    }

    if (task.worker_id) {
      const name = (task.workers as { name?: string } | null)?.name ?? "Unknown worker";
      const existing = workerMap.get(task.worker_id);
      const list = existing ? [...existing.tasks, task] : [task];
      const statuses = existing ? { ...existing.statuses } : {} as Record<string, number>;
      statuses[status] = (statuses[status] ?? 0) + 1;
      workerMap.set(task.worker_id, {
        name,
        taskCount: list.length,
        statuses,
        tasks: list,
      });
    }
  }

  const machineUtilization: MachineUtilization[] = Array.from(machineMap.entries()).map(
    ([machineId, v]) => ({
      machineId,
      machineName: v.name,
      taskCount: v.taskCount,
      totalMinutes: Math.round(v.totalMinutes),
      statuses: v.statuses,
    })
  );

  const workerActivity: WorkerActivity[] = Array.from(workerMap.entries()).map(
    ([workerId, v]) => {
      const currentTask =
        v.tasks.find(
          (t) =>
            t.start_time &&
            t.end_time &&
            parseIso(t.start_time) <= now &&
            parseIso(t.end_time) >= now &&
            !COMPLETED_TASK_STATUSES.includes(t.status ?? "")
        ) ?? null;
      return {
        workerId,
        workerName: v.name,
        taskCount: v.taskCount,
        currentTask: currentTask ?? null,
        statuses: v.statuses,
      };
    }
  );

  const delayedWorkOrders: DelayedItem[] = [];
  for (const wo of workOrders) {
    if (!wo.deadline) continue;
    const deadline = parseIso(wo.deadline);
    if (deadline < now && ACTIVE_WO_STATUSES.includes(wo.status)) {
      delayedWorkOrders.push({
        type: "work_order",
        id: wo.id,
        label: wo.products?.name ?? "Work order",
        deadlineOrEnd: wo.deadline,
        status: wo.status,
        workOrderId: wo.id,
        productName: wo.products?.name ?? undefined,
      });
    }
  }

  return {
    workOrders: activeWorkOrders,
    tasks,
    machineUtilization,
    workerActivity,
    delayedWorkOrders,
    delayedTasks,
    kpis: {
      activeWorkOrderCount: activeWorkOrders.length,
      inProgressTaskCount: inProgressCount,
      delayedCount: delayedWorkOrders.length + delayedTasks.length,
      machinesInUseCount: machineUtilization.length,
      workersActiveCount: workerActivity.length,
    },
  };
}
