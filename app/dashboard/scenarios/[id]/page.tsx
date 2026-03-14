import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listProductionLines } from "@/lib/services/production-lines";
import { listMachinesByFacility } from "@/lib/services/machines";
import { listWorkers } from "@/lib/services/workers";
import { getScenarioById, listScenarioTasks, type ScenarioTask } from "@/lib/services/scenarios";
import { getLiveScheduleMetrics, getScenarioScheduleMetrics } from "@/lib/services/scenario-metrics";
import { updateScenarioTaskAction } from "../actions";

function formatDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function pct(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-black/30">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-black dark:text-white">{value}</div>
      {hint ? <div className="mt-2 text-sm text-black/60 dark:text-white/60">{hint}</div> : null}
    </div>
  );
}

export default async function ScenarioDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";
  const message = typeof sp.message === "string" ? sp.message : "";
  const workOrderId = typeof sp.workOrderId === "string" ? sp.workOrderId : "";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=/dashboard/scenarios/${encodeURIComponent(id)}`);
  }

  let scenario: Awaited<ReturnType<typeof getScenarioById>> | null = null;
  let scenarioError = "";
  try {
    scenario = await getScenarioById(supabase, id);
  } catch (e) {
    scenarioError = e instanceof Error ? e.message : "Failed to load scenario.";
  }

  const orgId = scenario?.organization_id ?? "";
  const facilityId = scenario?.facility_id ?? null;
  const fallbackStart = scenario?.created_at ?? new Date(0).toISOString();
  const fallbackEnd = scenario?.updated_at ?? scenario?.created_at ?? new Date(0).toISOString();
  const rangeStart = scenario?.range_start ?? fallbackStart;
  const rangeEnd = scenario?.range_end ?? fallbackEnd;

  let allTasks: ScenarioTask[] = [];
  let tasksError = "";
  try {
    allTasks = scenario ? await listScenarioTasks(supabase, { scenarioId: id, limit: 500 }) : [];
  } catch (e) {
    tasksError = e instanceof Error ? e.message : "Failed to load scenario tasks.";
  }

  const taskWorkOrderIds = Array.from(new Set(allTasks.map((t) => t.work_order_id)));
  const selectedWorkOrderId = workOrderId || taskWorkOrderIds[0] || "";

  const tasks = selectedWorkOrderId
    ? allTasks.filter((t) => t.work_order_id === selectedWorkOrderId)
    : allTasks.slice(0, 50);

  let productionLines: Awaited<ReturnType<typeof listProductionLines>> = [];
  let machines: Awaited<ReturnType<typeof listMachinesByFacility>> = [];
  let workers: Awaited<ReturnType<typeof listWorkers>> = [];
  try {
    productionLines = facilityId ? await listProductionLines(supabase, { facilityId }) : [];
  } catch {}
  try {
    machines = facilityId ? await listMachinesByFacility(supabase, facilityId) : [];
  } catch {}
  try {
    workers = facilityId ? await listWorkers(supabase, { facilityId }) : [];
  } catch {}

  let liveMetrics = null as Awaited<ReturnType<typeof getLiveScheduleMetrics>> | null;
  let scenarioMetrics = null as Awaited<ReturnType<typeof getScenarioScheduleMetrics>> | null;
  let metricsError = "";
  try {
    if (scenario && orgId) {
      liveMetrics = await getLiveScheduleMetrics(supabase, {
        organizationId: orgId,
        facilityId,
        rangeStart,
        rangeEnd,
      });
      scenarioMetrics = await getScenarioScheduleMetrics(supabase, {
        scenarioTasks: allTasks,
        facilityId,
        rangeStart,
        rangeEnd,
      });
    }
  } catch (e) {
    metricsError = e instanceof Error ? e.message : "Failed to compute metrics.";
  }

  const anyLoadError = error || scenarioError || tasksError || metricsError;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
            Scenario
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-black dark:text-white">
            {scenario?.name ?? "Scenario"}
          </h1>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            {scenario?.description ?? "Adjust task timings and resources to see delivery and capacity impact."}
          </p>
          <div className="mt-3 text-xs uppercase tracking-[0.25em] text-black/40 dark:text-white/50">
            Range {new Date(rangeStart).toISOString().slice(0, 10)} → {new Date(rangeEnd).toISOString().slice(0, 10)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/scenarios"
            className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:border-black/30 dark:border-white/10 dark:text-white/70 dark:hover:border-white/40"
          >
            Back
          </Link>
          <Link
            href={`/dashboard/scheduling/visual?organizationId=${encodeURIComponent(orgId)}&facilityId=${encodeURIComponent(
              facilityId ?? ""
            )}&workOrderId=${encodeURIComponent(selectedWorkOrderId)}`}
            className="rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            Live visual planner
          </Link>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          {message}
        </div>
      ) : null}
      {anyLoadError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
          {anyLoadError}
        </div>
      ) : null}

      {liveMetrics && scenarioMetrics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card
            label="On-time delivery"
            value={`${pct(scenarioMetrics.onTimeRate)} (scenario)`}
            hint={`${pct(liveMetrics.onTimeRate)} live • ${scenarioMetrics.lateWorkOrders} late`}
          />
          <Card
            label="Overload days"
            value={`${scenarioMetrics.machineOverloadDays} (scenario)`}
            hint={`${liveMetrics.machineOverloadDays} live`}
          />
          <Card
            label="Scheduled hours"
            value={`${scenarioMetrics.scheduledHours.toFixed(1)}h`}
            hint={`${liveMetrics.scheduledHours.toFixed(1)}h live`}
          />
          <Card
            label="Impacted work orders"
            value={`${scenarioMetrics.impactedWorkOrders}`}
            hint={`${liveMetrics.impactedWorkOrders} live in range`}
          />
        </div>
      ) : null}

      <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-black dark:text-white">Scenario tasks</h2>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              Edit task timing or resources for a single work order at a time.
            </p>
          </div>
          <form method="get" className="flex flex-wrap items-center gap-2">
            <select
              name="workOrderId"
              defaultValue={selectedWorkOrderId}
              className="rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none dark:border-white/10 dark:bg-black/40 dark:text-white"
            >
              {taskWorkOrderIds.map((woId) => (
                <option key={woId} value={woId}>
                  {woId.slice(0, 8)}
                </option>
              ))}
              {!taskWorkOrderIds.length ? <option value="">No tasks</option> : null}
            </select>
            <button
              type="submit"
              className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              Load
            </button>
          </form>
        </div>

        <div className="mt-5 space-y-3">
          {tasks.map((t) => (
            <form
              key={t.id}
              action={updateScenarioTaskAction}
              className="rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-black/20"
            >
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="scenarioId" value={id} />
              <input type="hidden" name="workOrderId" value={selectedWorkOrderId} />

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold uppercase tracking-[0.25em] text-black/50 dark:text-white/60">
                    {t.operations?.name ?? "Task"} • {t.id.slice(0, 8)}
                  </div>
                  <div className="mt-2 grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50 dark:text-white/60">
                        Start
                      </span>
                      <input
                        name="startTime"
                        type="datetime-local"
                        defaultValue={formatDateTimeLocal(t.start_time)}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none dark:border-white/10 dark:bg-black/40 dark:text-white"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50 dark:text-white/60">
                        End
                      </span>
                      <input
                        name="endTime"
                        type="datetime-local"
                        defaultValue={formatDateTimeLocal(t.end_time)}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none dark:border-white/10 dark:bg-black/40 dark:text-white"
                      />
                    </label>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50 dark:text-white/60">
                        Line
                      </span>
                      <select
                        name="productionLineId"
                        defaultValue={t.production_line_id ?? ""}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none dark:border-white/10 dark:bg-black/40 dark:text-white"
                      >
                        <option value="">Unassigned</option>
                        {productionLines.map((line) => (
                          <option key={line.id} value={line.id}>
                            {line.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50 dark:text-white/60">
                        Machine
                      </span>
                      <select
                        name="machineId"
                        defaultValue={t.machine_id ?? ""}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none dark:border-white/10 dark:bg-black/40 dark:text-white"
                      >
                        <option value="">Unassigned</option>
                        {machines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50 dark:text-white/60">
                        Worker
                      </span>
                      <select
                        name="workerId"
                        defaultValue={t.worker_id ?? ""}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none dark:border-white/10 dark:bg-black/40 dark:text-white"
                      >
                        <option value="">Unassigned</option>
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="mt-3 block">
                    <span className="text-xs font-semibold uppercase tracking-[0.25em] text-black/50 dark:text-white/60">
                      Notes
                    </span>
                    <input
                      name="notes"
                      defaultValue={t.notes ?? ""}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none dark:border-white/10 dark:bg-black/40 dark:text-white"
                    />
                  </label>
                </div>

                <div className="flex flex-shrink-0 flex-col gap-2">
                  <button
                    type="submit"
                    className="rounded-2xl bg-black px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  >
                    Save
                  </button>
                  <Link
                    href={`/dashboard/scheduling/visual?organizationId=${encodeURIComponent(orgId)}&facilityId=${encodeURIComponent(
                      facilityId ?? ""
                    )}&workOrderId=${encodeURIComponent(selectedWorkOrderId)}`}
                    className="rounded-2xl border border-black/10 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.3em] text-black hover:border-black/30 dark:border-white/10 dark:text-white/70 dark:hover:border-white/40"
                  >
                    Reschedule live
                  </Link>
                </div>
              </div>
            </form>
          ))}

          {!tasks.length ? (
            <div className="rounded-2xl border border-black/10 bg-white/60 p-6 text-sm text-black/60 dark:border-white/10 dark:bg-black/20 dark:text-white/60">
              No scenario tasks found for this work order.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
