"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { KpiDashboardData } from "@/lib/services/kpis";

const PIE_COLORS = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#f59e0b", "#ef4444", "#10b981"];

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function hours(value: number) {
  return `${value.toFixed(1)}h`;
}

function Card({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-black/30">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-black dark:text-white">{value}</div>
      {hint ? (
        <div className="mt-2 text-sm text-black/60 dark:text-white/60">{hint}</div>
      ) : null}
    </div>
  );
}

export default function KpiDashboard({ data }: { data: KpiDashboardData }) {
  const [showDetails, setShowDetails] = useState(false);

  const oeeBreakdown = useMemo(
    () => [
      { name: "Availability", value: Math.round(data.summary.availability * 100) },
      { name: "Performance", value: Math.round(data.summary.performance * 100) },
      { name: "Quality", value: Math.round(data.summary.quality * 100) },
    ],
    [data.summary.availability, data.summary.performance, data.summary.quality]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card label="OEE" value={pct(data.summary.oee)} hint="Availability x Performance x Quality" />
        <Card
          label="Utilization"
          value={pct(data.summary.avgMachineUtilization)}
          hint={`${hours(data.summary.scheduledHours)} scheduled in range`}
        />
        <Card
          label="On-time delivery"
          value={pct(data.summary.onTimeDelivery)}
          hint="Completed before deadline"
        />
        <Card
          label="Throughput"
          value={`${data.summary.throughputPerDay.toFixed(2)}/day`}
          hint={`${data.summary.completedWorkOrders} completed in range`}
        />
        <Card
          label="Work orders completed"
          value={pct(data.summary.completionRate)}
          hint={`${data.summary.completedWorkOrders} / ${data.summary.totalWorkOrders}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
                Throughput trend
              </div>
              <div className="mt-2 text-xl font-semibold text-black dark:text-white">
                Completed work orders per day
              </div>
            </div>
            <button
              type="button"
              className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? "Hide notes" : "Show notes"}
            </button>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.charts.throughputDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#0f172a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {showDetails && data.notes.length ? (
            <div className="mt-5 rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/70 dark:border-white/10 dark:bg-black/20 dark:text-white/70">
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
                Notes
              </div>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                {data.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
            OEE components
          </div>
          <div className="mt-2 text-xl font-semibold text-black dark:text-white">Availability / Performance / Quality</div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={oeeBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f172a" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm dark:border-white/10 dark:bg-black/20">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
                  Availability
                </div>
                <div className="mt-2 text-2xl font-semibold text-black dark:text-white">
                  {pct(data.summary.availability)}
                </div>
                <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                  Scheduled time over available time in range
                </div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm dark:border-white/10 dark:bg-black/20">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
                  Performance
                </div>
                <div className="mt-2 text-2xl font-semibold text-black dark:text-white">
                  {pct(data.summary.performance)}
                </div>
                <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                  Proxy based on product default production time
                </div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm dark:border-white/10 dark:bg-black/20">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
                  Quality
                </div>
                <div className="mt-2 text-2xl font-semibold text-black dark:text-white">
                  {pct(data.summary.quality)}
                </div>
                <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                  Assumes no scrap tracking
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
            Machine utilization
          </div>
          <div className="mt-2 text-xl font-semibold text-black dark:text-white">Top machines (range)</div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.utilizationByMachine}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="machineName" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={55} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip />
                <Bar dataKey="utilization" fill="#0f172a" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-black/60 dark:text-white/60">
            Utilization uses scheduled task time; if maintenance windows exist, available time excludes maintenance.
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-black/30">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50 dark:text-white/60">
            Work order completion
          </div>
          <div className="mt-2 text-xl font-semibold text-black dark:text-white">Status mix</div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.workOrderStatus}
                    dataKey="count"
                    nameKey="status"
                    outerRadius={90}
                    innerRadius={55}
                    paddingAngle={2}
                  >
                    {data.charts.workOrderStatus.map((entry, idx) => (
                      <Cell key={entry.status} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {data.charts.workOrderStatus.slice(0, 8).map((s, idx) => (
                <div key={s.status} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="uppercase tracking-[0.2em] text-black/60 dark:text-white/60">
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="font-semibold text-black dark:text-white">{s.count}</span>
                </div>
              ))}
              {!data.charts.workOrderStatus.length ? (
                <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-black/60 dark:border-white/10 dark:bg-black/20 dark:text-white/60">
                  No work orders found.
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-4 text-sm text-black/60 dark:text-white/60">
            Completion rate card is `completed / total` for the organization.
          </div>
        </div>
      </div>
    </div>
  );
}
