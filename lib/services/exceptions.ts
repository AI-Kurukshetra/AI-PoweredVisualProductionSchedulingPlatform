import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";
import type { AlertSeverity, AlertType, AlertUpsertInput } from "./alerts";
import { listHolidays, listWorkerShiftAssignments } from "./calendar";
import { listInventoryStock } from "./inventory";

type ScheduledTaskRow = {
  id: string;
  work_order_id: string;
  machine_id: string | null;
  worker_id: string | null;
  start_time: string | null;
  end_time: string | null;
  production_line_id: string | null;
  work_orders?: {
    id: string;
    organization_id: string;
    product_id: string;
    quantity: unknown;
    status: string;
    products?: { id: string; name: string } | null;
  } | null;
  machines?: { id: string; name: string; capacity: unknown } | null;
  workers?: { id: string; name: string } | null;
  production_lines?: { id: string; facility_id: string; name: string } | null;
};

function n(value: unknown) {
  const num = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toIsoDateUtc(isoLike: string) {
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toWeekdayShortUtc(isoLike: string) {
  const d = new Date(isoLike);
  const day = d.getUTCDay(); // 0..6 (Sun..Sat)
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day] ?? "Mon";
}

function timeToMinutes(hhmmss: string) {
  const parts = hhmmss.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  return h * 60 + m;
}

function minutesUtc(isoLike: string) {
  const d = new Date(isoLike);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function severityForType(type: AlertType): AlertSeverity {
  if (type === "material_shortage") return "high";
  if (type === "schedule_conflict_machine" || type === "schedule_conflict_worker") return "high";
  if (type === "machine_overload") return "medium";
  return "medium";
}

export async function detectExceptionAlerts(
  supabase: SupabaseLikeClient,
  input: { organizationId: string; facilityId?: string }
) {
  const scopeKey = input.facilityId ?? "org";
  let query = supabase
    .from("scheduling_tasks")
    .select(
      "id,work_order_id,machine_id,worker_id,start_time,end_time,production_line_id,work_orders(id,organization_id,product_id,quantity,status,products(id,name)),machines(id,name,capacity),workers(id,name),production_lines(id,facility_id,name)"
    )
    .not("start_time", "is", null)
    .not("end_time", "is", null)
    .eq("work_orders.organization_id", input.organizationId)
    .order("start_time", { ascending: true });

  if (input.facilityId) {
    query = query.eq("production_lines.facility_id", input.facilityId);
  }

  const result = await query;
  const tasks = (requireData(result) as unknown as ScheduledTaskRow[]).filter(
    (t) => Boolean(t.start_time) && Boolean(t.end_time)
  );

  const alerts: AlertUpsertInput[] = [];

  const byMachine = new Map<string, ScheduledTaskRow[]>();
  const byWorker = new Map<string, ScheduledTaskRow[]>();
  const workOrders = new Map<string, ScheduledTaskRow["work_orders"]>();

  for (const task of tasks) {
    if (task.work_orders?.id) workOrders.set(task.work_orders.id, task.work_orders);
    if (task.machine_id) {
      const list = byMachine.get(task.machine_id) ?? [];
      list.push(task);
      byMachine.set(task.machine_id, list);
    }
    if (task.worker_id) {
      const list = byWorker.get(task.worker_id) ?? [];
      list.push(task);
      byWorker.set(task.worker_id, list);
    }
  }

  // 1) Schedule conflicts: overlapping tasks on the same machine.
  for (const [machineId, list] of byMachine.entries()) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.start_time ?? "").getTime() - new Date(b.start_time ?? "").getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      const prevEnd = new Date(prev.end_time ?? "").getTime();
      const curStart = new Date(cur.start_time ?? "").getTime();
      if (!Number.isFinite(prevEnd) || !Number.isFinite(curStart)) continue;
      if (prevEnd > curStart) {
        const machineName = prev.machines?.name ?? cur.machines?.name ?? "Machine";
        alerts.push({
          organizationId: input.organizationId,
          facilityId: input.facilityId ?? null,
          type: "schedule_conflict_machine",
          severity: severityForType("schedule_conflict_machine"),
          fingerprint: `auto:schedule_conflict_machine:${scopeKey}:${machineId}:${prev.id}:${cur.id}`,
          title: `Machine conflict: ${machineName}`,
          message: `Two tasks overlap on ${machineName} (${prev.start_time} → ${prev.end_time}) and (${cur.start_time} → ${cur.end_time}).`,
          machineId,
          schedulingTaskId: cur.id,
          workOrderId: cur.work_order_id ?? null,
          meta: { taskA: prev.id, taskB: cur.id },
        });
      }
    }
  }

  // 2) Schedule conflicts: overlapping tasks on the same worker.
  for (const [workerId, list] of byWorker.entries()) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.start_time ?? "").getTime() - new Date(b.start_time ?? "").getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      const prevEnd = new Date(prev.end_time ?? "").getTime();
      const curStart = new Date(cur.start_time ?? "").getTime();
      if (!Number.isFinite(prevEnd) || !Number.isFinite(curStart)) continue;
      if (prevEnd > curStart) {
        const workerName = prev.workers?.name ?? cur.workers?.name ?? "Worker";
        alerts.push({
          organizationId: input.organizationId,
          facilityId: input.facilityId ?? null,
          type: "schedule_conflict_worker",
          severity: severityForType("schedule_conflict_worker"),
          fingerprint: `auto:schedule_conflict_worker:${scopeKey}:${workerId}:${prev.id}:${cur.id}`,
          title: `Worker conflict: ${workerName}`,
          message: `Two tasks overlap for ${workerName} (${prev.start_time} → ${prev.end_time}) and (${cur.start_time} → ${cur.end_time}).`,
          workerId,
          schedulingTaskId: cur.id,
          workOrderId: cur.work_order_id ?? null,
          meta: { taskA: prev.id, taskB: cur.id },
        });
      }
    }
  }

  // 3) Machine overload: tasks per day > machine capacity (interpreted as max tasks/day).
  for (const [machineId, list] of byMachine.entries()) {
    const capacity = n(list[0]?.machines?.capacity);
    if (!capacity) continue;
    const counts = new Map<string, number>();
    for (const task of list) {
      const day = task.start_time ? toIsoDateUtc(task.start_time) : "";
      if (!day) continue;
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    for (const [day, count] of counts.entries()) {
      if (count > capacity) {
        const machineName = list[0]?.machines?.name ?? "Machine";
        const sample = list.find((t) => toIsoDateUtc(t.start_time ?? "") === day) ?? list[0]!;
        alerts.push({
          organizationId: input.organizationId,
          facilityId: input.facilityId ?? null,
          type: "machine_overload",
          severity: severityForType("machine_overload"),
          fingerprint: `auto:machine_overload:${scopeKey}:${machineId}:${day}`,
          title: `Machine overload: ${machineName}`,
          message: `${machineName} has ${count} scheduled tasks on ${day}, above capacity ${capacity}.`,
          machineId,
          schedulingTaskId: sample.id,
          workOrderId: sample.work_order_id ?? null,
          meta: { day, count, capacity },
        });
      }
    }
  }

  // 4) Worker unavailability: scheduled outside assigned shifts or on a holiday.
  const holidays = await listHolidays(supabase, { organizationId: input.organizationId }).catch(() => []);
  const holidayByDate = new Map<string, string>();
  for (const h of holidays) {
    holidayByDate.set(h.date, h.name);
  }

  const workerIds = Array.from(byWorker.keys());
  const workerShiftAssignments = workerIds.length
    ? await listWorkerShiftAssignments(supabase, { workerIds }).catch(() => [])
    : [];

  const workerShiftMap = workerShiftAssignments.reduce<Record<string, typeof workerShiftAssignments>>(
    (acc, assignment) => {
      if (!assignment.worker_id) return acc;
      const existing = acc[assignment.worker_id] ?? [];
      existing.push(assignment);
      acc[assignment.worker_id] = existing;
      return acc;
    },
    {}
  );

  for (const [workerId, list] of byWorker.entries()) {
    const assignments = workerShiftMap[workerId] ?? [];
    for (const task of list) {
      const startIso = task.start_time ?? "";
      const endIso = task.end_time ?? "";
      const day = startIso ? toIsoDateUtc(startIso) : "";
      if (day && holidayByDate.has(day)) {
        alerts.push({
          organizationId: input.organizationId,
          facilityId: input.facilityId ?? null,
          type: "worker_unavailable",
          severity: "high",
          fingerprint: `auto:worker_unavailable:holiday:${scopeKey}:${workerId}:${task.id}`,
          title: `Worker scheduled on holiday`,
          message: `${task.workers?.name ?? "Worker"} is scheduled on ${day} (${holidayByDate.get(day)}).`,
          workerId,
          schedulingTaskId: task.id,
          workOrderId: task.work_order_id ?? null,
          meta: { day, holiday: holidayByDate.get(day) },
        });
        continue;
      }

      if (!assignments.length) {
        alerts.push({
          organizationId: input.organizationId,
          facilityId: input.facilityId ?? null,
          type: "worker_unavailable",
          severity: "medium",
          fingerprint: `auto:worker_unavailable:noshift:${scopeKey}:${workerId}:${task.id}`,
          title: `Worker has no shift assignment`,
          message: `${task.workers?.name ?? "Worker"} is scheduled (${startIso} → ${endIso}) without any shift assignment.`,
          workerId,
          schedulingTaskId: task.id,
          workOrderId: task.work_order_id ?? null,
        });
        continue;
      }

      const weekday = startIso ? toWeekdayShortUtc(startIso) : "Mon";
      const startMin = startIso ? minutesUtc(startIso) : 0;
      const endMin = endIso ? minutesUtc(endIso) : startMin;

      const shiftOk = assignments.some((a) => {
        const shift = a.shifts;
        if (!shift) return false;
        const days = shift.days_of_week ?? [];
        const inDay = !days.length || days.includes(weekday);
        if (!inDay) return false;
        const shiftStart = timeToMinutes(shift.start_time);
        const shiftEnd = timeToMinutes(shift.end_time);
        if (shiftEnd >= shiftStart) {
          return startMin >= shiftStart && endMin <= shiftEnd;
        }
        // Overnight shift (e.g. 22:00 → 06:00): allow wrapping.
        return startMin >= shiftStart || endMin <= shiftEnd;
      });

      if (!shiftOk) {
        alerts.push({
          organizationId: input.organizationId,
          facilityId: input.facilityId ?? null,
          type: "worker_unavailable",
          severity: "medium",
          fingerprint: `auto:worker_unavailable:shift:${scopeKey}:${workerId}:${task.id}`,
          title: `Worker scheduled outside shift`,
          message: `${task.workers?.name ?? "Worker"} is scheduled (${startIso} → ${endIso}) outside assigned shifts.`,
          workerId,
          schedulingTaskId: task.id,
          workOrderId: task.work_order_id ?? null,
          meta: { weekday },
        });
      }
    }
  }

  // 5) Material shortages: compare required BOM against facility stock.
  if (input.facilityId) {
    const workOrderList = Array.from(workOrders.values()).filter(Boolean) as NonNullable<
      ScheduledTaskRow["work_orders"]
    >[];
    const productIds = Array.from(new Set(workOrderList.map((w) => w.product_id).filter(Boolean)));

    if (productIds.length) {
      const bomResult = await supabase
        .from("bill_of_materials")
        .select("product_id,material_id,quantity,unit,materials(id,name,code)")
        .in("product_id", productIds);
      const bomItems = requireData(bomResult) as unknown as Array<{
        product_id: string;
        material_id: string;
        quantity: unknown;
        unit: string;
        materials?: { id: string; name: string; code: string | null } | null;
      }>;

      const stock = await listInventoryStock(supabase, { facilityId: input.facilityId }).catch(() => []);
      const stockByMaterial = new Map(
        stock.map((s) => [
          s.material_id,
          {
            available: n(s.on_hand) - n(s.reserved),
            unit: s.unit,
            name: s.materials?.name ?? "Material",
            code: s.materials?.code ?? null,
          },
        ])
      );

      const bomByProduct = new Map<string, typeof bomItems>();
      for (const item of bomItems) {
        const list = bomByProduct.get(item.product_id) ?? [];
        list.push(item);
        bomByProduct.set(item.product_id, list);
      }

      const requiredByMaterial = new Map<
        string,
        { required: number; unit: string; name: string; code: string | null }
      >();

      for (const w of workOrderList) {
        const qty = n(w.quantity);
        const items = bomByProduct.get(w.product_id) ?? [];
        for (const item of items) {
          const materialId = item.material_id;
          const req = qty * n(item.quantity);
          const existing = requiredByMaterial.get(materialId) ?? {
            required: 0,
            unit: item.unit,
            name: item.materials?.name ?? "Material",
            code: item.materials?.code ?? null,
          };
          existing.required += req;
          requiredByMaterial.set(materialId, existing);
        }
      }

      for (const [materialId, req] of requiredByMaterial.entries()) {
        const stockInfo = stockByMaterial.get(materialId);
        const available = stockInfo?.available ?? 0;
        if (req.required > available) {
          const shortage = req.required - available;
          alerts.push({
            organizationId: input.organizationId,
            facilityId: input.facilityId,
            type: "material_shortage",
            severity: "high",
            fingerprint: `auto:material_shortage:${scopeKey}:${materialId}`,
            title: `Material shortage: ${req.name}`,
            message: `Required ${req.required.toFixed(2)} ${req.unit}, available ${available.toFixed(
              2
            )}. Short by ${shortage.toFixed(2)}.`,
            materialId,
            meta: {
              required: req.required,
              available,
              shortage,
              unit: req.unit,
              code: req.code,
            },
          });
        }
      }
    }
  }

  return alerts;
}
