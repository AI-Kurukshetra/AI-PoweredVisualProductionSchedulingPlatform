"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getMonitoringDataAction } from "./actions";
import type {
  MonitoringData,
  WorkerActivity,
  DelayedItem,
} from "@/lib/services/monitoring";
import type { WorkOrderWithProduct } from "@/lib/services/work-orders";

type MonitoringDashboardProps = {
  organizationId: string;
  initialData: MonitoringData;
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-slate-500",
  scheduled: "bg-blue-500",
  in_progress: "bg-amber-500",
  released: "bg-indigo-500",
  completed: "bg-emerald-500",
  cancelled: "bg-black/30",
};

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-black/40";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white ${color}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function MonitoringDashboard({
  organizationId,
  initialData,
}: MonitoringDashboardProps) {
  const [data, setData] = useState<MonitoringData>(initialData);
  const [live, setLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());

  const refetch = useCallback(async () => {
    const next = await getMonitoringDataAction(organizationId);
    if (next) {
      setData(next);
      setLastUpdated(new Date());
    }
  }, [organizationId]);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    const ref = { organizationId };

    const channel = supabase
      .channel("monitoring")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "work_orders",
          filter: `organization_id=eq.${ref.organizationId}`,
        },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "operations" },
        () => refetch()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduling_tasks" },
        () => refetch()
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, refetch]);

  const { kpis, workOrders, tasks, machineUtilization, workerActivity, delayedWorkOrders, delayedTasks } = data;
  const delayedAll: DelayedItem[] = [...delayedWorkOrders, ...delayedTasks];

  const chartData: { name: string; tasks: number; minutes: number }[] = machineUtilization.map(
    (m) => ({ name: m.machineName, tasks: m.taskCount, minutes: m.totalMinutes })
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-black/40">
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`}
            title={live ? "Realtime connected" : "Reconnecting…"}
          />
          <span className="text-sm font-medium text-black dark:text-white">
            {live ? "Live" : "Connecting…"}
          </span>
          <span className="text-xs text-black/50 dark:text-white/50">
            Updated {format(lastUpdated, "HH:mm:ss")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-xl border border-black/10 px-3 py-1.5 text-xs font-medium text-black hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Active work orders"
          value={kpis.activeWorkOrderCount}
          href={`/dashboard/work-orders?organizationId=${encodeURIComponent(organizationId)}`}
        />
        <KpiCard label="Tasks in progress" value={kpis.inProgressTaskCount} />
        <KpiCard label="Delayed" value={kpis.delayedCount} alert={kpis.delayedCount > 0} />
        <KpiCard label="Machines in use" value={kpis.machinesInUseCount} />
        <KpiCard label="Workers active" value={kpis.workersActiveCount} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            Machine utilization
          </h2>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Task count and total scheduled minutes per machine
          </p>
          {chartData.length > 0 ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "1rem",
                      border: "1px solid rgba(0,0,0,0.1)",
                    }}
                    formatter={(value, name) =>
                      name === "tasks" ? [value ?? 0, "Tasks"] : [value ?? 0, "Minutes"]
                    }
                    labelFormatter={(label) => `Machine: ${label}`}
                  />
                  <Bar dataKey="tasks" name="Tasks" fill="rgb(99 102 241)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="minutes" name="Minutes" fill="rgb(30 58 138)" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="rgb(30 58 138)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-4 text-sm text-black/50 dark:text-white/50">
              No machine utilization data yet. Schedule tasks to see usage.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
          <h2 className="text-lg font-semibold text-black dark:text-white">Schedule progress</h2>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Tasks by status across all active work orders
          </p>
          {tasks.length > 0 ? (
            <div className="mt-4 space-y-2">
              {["scheduled", "in_progress", "completed"].map((status) => {
                const count = tasks.filter((t) => (t.status ?? "") === status).length;
                const pct = Math.round((count / tasks.length) * 100);
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-24 text-xs font-medium capitalize text-black/70 dark:text-white/70">
                      {status.replace(/_/g, " ")}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-black/50 dark:text-white/50">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-black/50 dark:text-white/50">
              No scheduled tasks yet.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
        <h2 className="text-lg font-semibold text-black dark:text-white">Active work orders</h2>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          Work orders in planned, scheduled, in progress, or released
        </p>
        {workOrders.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-black/10 text-xs uppercase tracking-wider text-black/60 dark:border-white/10 dark:text-white/60">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Product</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Priority</th>
                  <th className="pb-3 pr-4 font-medium">Deadline</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 dark:divide-white/10">
                {workOrders.map((wo) => (
                  <WorkOrderRow key={wo.id} workOrder={wo} organizationId={organizationId} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-black/50 dark:text-white/50">
            No active work orders. Create work orders to see them here.
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
          <h2 className="text-lg font-semibold text-black dark:text-white">Worker activity</h2>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Assigned tasks and current activity
          </p>
          {workerActivity.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {workerActivity.map((w) => (
                <WorkerRow key={w.workerId} worker={w} />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-black/50 dark:text-white/50">
              No worker assignments yet.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
          <h2 className="text-lg font-semibold text-black dark:text-white">Delays & at risk</h2>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Overdue work orders and tasks
          </p>
          {delayedAll.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {delayedAll.map((d) => (
                <DelayedRow key={`${d.type}-${d.id}`} item={d} />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
              No delays. Schedule is on track.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  alert,
  href,
}: {
  label: string;
  value: number;
  alert?: boolean;
  href?: string;
}) {
  const content = (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        alert ? "border-amber-300 bg-amber-50/80 dark:border-amber-500/40 dark:bg-amber-500/10" : "border-black/10 bg-white/80 dark:border-white/10 dark:bg-black/40"
      }`}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-black/50 dark:text-white/50">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${alert ? "text-amber-800 dark:text-amber-200" : "text-black dark:text-white"}`}>
        {value}
      </div>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
}

function WorkOrderRow({
  workOrder,
  organizationId,
}: {
  workOrder: WorkOrderWithProduct;
  organizationId: string;
}) {
  return (
    <tr className="text-black/80 dark:text-white/80">
      <td className="py-3 pr-4 font-medium">
        {workOrder.products?.name ?? "—"}
        {workOrder.products?.sku ? (
          <span className="ml-2 text-xs text-black/50 dark:text-white/50">{workOrder.products.sku}</span>
        ) : null}
      </td>
      <td className="py-3 pr-4">
        <StatusPill status={workOrder.status} />
      </td>
      <td className="py-3 pr-4">{workOrder.priority}</td>
      <td className="py-3 pr-4">
        {workOrder.deadline
          ? format(new Date(workOrder.deadline), "MMM d, yyyy HH:mm")
          : "—"}
      </td>
      <td className="py-3">
        <Link
          href={`/dashboard/work-orders/${workOrder.id}/edit?organizationId=${encodeURIComponent(organizationId)}`}
          className="rounded-xl px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10"
        >
          Edit
        </Link>
      </td>
    </tr>
  );
}

function WorkerRow({ worker }: { worker: WorkerActivity }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-black/10 bg-white/50 px-4 py-3 dark:border-white/10 dark:bg-black/20">
      <div>
        <div className="font-medium text-black dark:text-white">{worker.workerName}</div>
        <div className="text-xs text-black/50 dark:text-white/50">
          {worker.taskCount} task{worker.taskCount !== 1 ? "s" : ""} assigned
        </div>
      </div>
      <div className="text-right">
        {worker.currentTask ? (
          <StatusPill status={worker.currentTask.status ?? "in_progress"} />
        ) : (
          <span className="text-xs text-black/40 dark:text-white/40">Idle / queued</span>
        )}
      </div>
    </li>
  );
}

function DelayedRow({ item }: { item: DelayedItem }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div>
        <span className="font-medium text-amber-900 dark:text-amber-200">{item.label}</span>
        <span className="ml-2 text-xs text-amber-700 dark:text-amber-300">
          {item.type === "work_order" ? "Work order" : "Task"} · {item.status}
        </span>
      </div>
      <span className="text-xs text-amber-800 dark:text-amber-200">
        Due {format(new Date(item.deadlineOrEnd), "MMM d HH:mm")}
      </span>
    </li>
  );
}
