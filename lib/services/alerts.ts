import type { SupabaseLikeClient } from "./supabase-helpers";
import { requireData } from "./supabase-helpers";

export type AlertStatus = "open" | "acknowledged" | "resolved" | "dismissed";
export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type AlertType =
  | "schedule_conflict_machine"
  | "schedule_conflict_worker"
  | "machine_overload"
  | "worker_unavailable"
  | "material_shortage";

export type Alert = {
  id: string;
  organization_id: string;
  facility_id: string | null;
  alert_type: AlertType | string;
  severity: AlertSeverity | string;
  status: AlertStatus | string;
  fingerprint: string;
  title: string;
  message: string;
  work_order_id: string | null;
  scheduling_task_id: string | null;
  machine_id: string | null;
  worker_id: string | null;
  material_id: string | null;
  meta: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AlertUpsertInput = {
  organizationId: string;
  facilityId?: string | null;
  type: AlertType;
  severity: AlertSeverity;
  status?: AlertStatus;
  fingerprint: string;
  title: string;
  message: string;
  workOrderId?: string | null;
  schedulingTaskId?: string | null;
  machineId?: string | null;
  workerId?: string | null;
  materialId?: string | null;
  meta?: Record<string, unknown>;
};

export async function listAlerts(
  supabase: SupabaseLikeClient,
  input: {
    organizationId: string;
    facilityId?: string;
    status?: AlertStatus;
    limit?: number;
  }
) {
  let query = supabase
    .from("alerts")
    .select(
      "id,organization_id,facility_id,alert_type,severity,status,fingerprint,title,message,work_order_id,scheduling_task_id,machine_id,worker_id,material_id,meta,created_by,created_at,updated_at"
    )
    .eq("organization_id", input.organizationId)
    .order("updated_at", { ascending: false });

  if (input.facilityId) query = query.eq("facility_id", input.facilityId);
  if (input.status) query = query.eq("status", input.status);
  if (typeof input.limit === "number") query = query.limit(input.limit);

  const result = await query;
  return requireData(result) as unknown as Alert[];
}

export async function countOpenAlerts(supabase: SupabaseLikeClient) {
  const result = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if (result.error) {
    // Keep dashboard usable if the alerts table isn't deployed yet.
    return 0;
  }
  return result.count ?? 0;
}

export async function upsertAlerts(supabase: SupabaseLikeClient, alerts: AlertUpsertInput[]) {
  if (!alerts.length) return [];

  const payload = alerts.map((a) => ({
    organization_id: a.organizationId,
    facility_id: a.facilityId ?? null,
    alert_type: a.type,
    severity: a.severity,
    status: a.status ?? "open",
    fingerprint: a.fingerprint,
    title: a.title,
    message: a.message,
    work_order_id: a.workOrderId ?? null,
    scheduling_task_id: a.schedulingTaskId ?? null,
    machine_id: a.machineId ?? null,
    worker_id: a.workerId ?? null,
    material_id: a.materialId ?? null,
    meta: a.meta ?? {},
  }));

  const result = await supabase
    .from("alerts")
    .upsert(payload, { onConflict: "organization_id,fingerprint" })
    .select(
      "id,organization_id,facility_id,alert_type,severity,status,fingerprint,title,message,work_order_id,scheduling_task_id,machine_id,worker_id,material_id,meta,created_by,created_at,updated_at"
    );

  return requireData(result) as unknown as Alert[];
}

export async function resolveAlert(supabase: SupabaseLikeClient, id: string) {
  const result = await supabase
    .from("alerts")
    .update({ status: "resolved" })
    .eq("id", id)
    .select(
      "id,organization_id,facility_id,alert_type,severity,status,fingerprint,title,message,work_order_id,scheduling_task_id,machine_id,worker_id,material_id,meta,created_by,created_at,updated_at"
    )
    .single();
  return requireData(result) as unknown as Alert;
}

export async function resolveMissingAutoAlerts(
  supabase: SupabaseLikeClient,
  input: { organizationId: string; facilityId?: string | null; keepFingerprints: string[] }
) {
  // Resolve stale alerts from previous runs (best-effort; no hard failure).
  let query = supabase
    .from("alerts")
    .update({ status: "resolved" })
    .eq("organization_id", input.organizationId)
    .eq("status", "open")
    .like("fingerprint", "auto:%");

  if (input.facilityId) query = query.eq("facility_id", input.facilityId);
  if (input.keepFingerprints.length) query = query.not("fingerprint", "in", `(${input.keepFingerprints.map((f) => `"${f}"`).join(",")})`);

  const result = await query.select("id");
  if (result.error) {
    return 0;
  }
  return (result.data ?? []).length;
}

