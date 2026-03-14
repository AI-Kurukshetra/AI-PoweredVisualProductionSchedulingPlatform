"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import { SchedulingTaskWithRefs, updateSchedulingTask } from "@/lib/services/scheduling-tasks";
import { ProductionLineWithFacility } from "@/lib/services/production-lines";
import { useToast } from "@/app/components/Toaster";
import {
  Holiday,
  MaintenanceWindow,
  MachineShiftAssignment,
  Shift,
  WorkerShiftAssignment,
} from "@/lib/services/calendar";

type SchedulerBoardProps = {
  initialTasks: SchedulingTaskWithRefs[];
  productionLines: ProductionLineWithFacility[];
  selectedWorkOrderId?: string;
  selectedWorkOrderLabel?: string;
  organizationId: string;
  facilityId: string | null;
  fallbackTimestamp: number;
  shifts: Shift[];
  holidays: Holiday[];
  maintenanceWindows: MaintenanceWindow[];
  machineShiftAssignments: MachineShiftAssignment[];
  workerShiftAssignments: WorkerShiftAssignment[];
};

const MIN_DURATION_MS = 15 * 60 * 1000;
const MIN_RANGE_MS = 45 * 60 * 1000;
const RANGE_PADDING_MS = 30 * 60 * 1000;

type InteractionMode = "move" | "resize-start" | "resize-end";

type InteractionState = {
  taskId: string;
  mode: InteractionMode;
  pointerX: number;
  containerWidth: number;
  baseStart: number;
  baseEnd: number;
  latestStart: number;
  latestEnd: number;
};

type RealtimeSchedulingTaskRecord = Partial<SchedulingTaskWithRefs> & {
  id: string;
  work_order_id: string;
};

function isRealtimeSchedulingTaskRecord(value: unknown): value is RealtimeSchedulingTaskRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as { id?: unknown; work_order_id?: unknown };
  return typeof record.id === "string" && typeof record.work_order_id === "string";
}

export default function SchedulerBoard({
  initialTasks,
  productionLines,
  selectedWorkOrderId,
  selectedWorkOrderLabel,
  organizationId,
  facilityId,
  fallbackTimestamp,
  shifts,
  holidays,
  maintenanceWindows,
  machineShiftAssignments,
  workerShiftAssignments,
}: SchedulerBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const { showToast } = useToast();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const scheduledTasks = useMemo(
    () => tasks.filter((task) => task.start_time && task.end_time),
    [tasks]
  );
  const unscheduledTasks = useMemo(
    () => tasks.filter((task) => !task.start_time || !task.end_time),
    [tasks]
  );
  const timelineRange = useMemo(() => {
    if (!scheduledTasks.length) {
      const now = fallbackTimestamp;
      return {
        start: now,
        end: now + MIN_RANGE_MS,
      };
    }

    const sortedStarts = scheduledTasks
      .map((task) => new Date(task.start_time ?? "").getTime())
      .filter(Boolean);
    const sortedEnds = scheduledTasks
      .map((task) => new Date(task.end_time ?? "").getTime())
      .filter(Boolean);
    const minStart = Math.min(...sortedStarts);
    const maxEnd = Math.max(...sortedEnds);
    return {
      start: Math.max(0, minStart - RANGE_PADDING_MS),
      end: Math.max(minStart + MIN_RANGE_MS, maxEnd + RANGE_PADDING_MS),
    };
  }, [scheduledTasks, fallbackTimestamp]);

  const totalRangeMs = Math.max(timelineRange.end - timelineRange.start, MIN_RANGE_MS);

  const ticks = useMemo(() => {
    const segments = 6;
    const chunk = totalRangeMs / segments;
    return Array.from({ length: segments + 1 }, (_, index) =>
      new Date(timelineRange.start + chunk * index)
    );
  }, [timelineRange.start, totalRangeMs]);

  const lanes = useMemo(() => {
    const base = productionLines.map((line, index) => ({
      id: line.id,
      name: line.name ?? `Line ${index + 1}`,
    }));
    const assignedLineIds = new Set(productionLines.map((line) => line.id));
    const extraIds = new Set<string>();
    scheduledTasks.forEach((task) => {
      const targetId = task.production_line_id ?? "unassigned";
      if (!assignedLineIds.has(targetId) && targetId !== "unassigned") {
        extraIds.add(targetId);
      }
    });
    const extras = Array.from(extraIds).map((id, idx) => ({
      id,
      name: `Other line ${idx + 1}`,
    }));
    const unassignedNeeded = scheduledTasks.some((task) => !task.production_line_id);
    return [
      ...base,
      ...extras,
      ...(unassignedNeeded ? [{ id: "unassigned", name: "Unassigned line" }] : []),
    ];
  }, [productionLines, scheduledTasks]);

  const laneTasksMap = useMemo(() => {
    return lanes.reduce<Record<string, SchedulingTaskWithRefs[]>>((acc, lane) => {
      acc[lane.id] = scheduledTasks.filter(
        (task) => (task.production_line_id ?? "unassigned") === lane.id
      );
      return acc;
    }, {});
  }, [lanes, scheduledTasks]);

  const startInteraction = (
    task: SchedulingTaskWithRefs,
    mode: InteractionMode,
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!timelineRef.current) return;
    const track = timelineRef.current.querySelector(".scheduler-track");
    if (!track) return;
    const bounds = track.getBoundingClientRect();
    const startMs = task.start_time ? new Date(task.start_time).getTime() : timelineRange.start;
    const endMs = task.end_time ? new Date(task.end_time).getTime() : startMs + MIN_DURATION_MS;
    setInteraction({
      taskId: task.id,
      mode,
      pointerX: event.clientX,
      containerWidth: Math.max(bounds.width, 1),
      baseStart: startMs,
      baseEnd: endMs,
      latestStart: startMs,
      latestEnd: endMs,
    });
    window.getSelection()?.removeAllRanges();
  };

  const persistInteraction = useCallback(
    async (state: InteractionState) => {
      const startIso = new Date(state.latestStart).toISOString();
      const endIso = new Date(state.latestEnd).toISOString();
      try {
        await updateSchedulingTask(supabase, {
          id: state.taskId,
          startTime: startIso,
          endTime: endIso,
        });
        showToast("Task scheduled", "success");
      } catch (error) {
        console.error(error);
        showToast("Unable to persist task update", "error");
      }
    },
    [showToast, supabase]
  );

  const activeTaskId = interaction?.taskId;

  useEffect(() => {
    if (!activeTaskId) return;

    const handleMove = (event: globalThis.PointerEvent) => {
      event.preventDefault();
      setInteraction((current) => {
        if (!current) return null;
        const deltaRatio = (event.clientX - current.pointerX) / current.containerWidth;
        const deltaMs = deltaRatio * totalRangeMs;
        let nextStart = current.baseStart;
        let nextEnd = current.baseEnd;

        if (current.mode === "move") {
          nextStart += deltaMs;
          nextEnd += deltaMs;
        } else if (current.mode === "resize-start") {
          nextStart += deltaMs;
          nextStart = Math.min(nextStart, nextEnd - MIN_DURATION_MS);
        } else {
          nextEnd += deltaMs;
          nextEnd = Math.max(nextEnd, nextStart + MIN_DURATION_MS);
        }

        nextStart = Math.max(timelineRange.start, Math.min(nextStart, nextEnd - MIN_DURATION_MS));
        nextEnd = Math.min(timelineRange.end, Math.max(nextEnd, nextStart + MIN_DURATION_MS));

        const nextStartIso = new Date(nextStart).toISOString();
        const nextEndIso = new Date(nextEnd).toISOString();
        setTasks((prev) =>
          prev.map((task) =>
            task.id === current.taskId ? { ...task, start_time: nextStartIso, end_time: nextEndIso } : task
          )
        );

        return { ...current, latestStart: nextStart, latestEnd: nextEnd };
      });
    };

    const handleUp = () => {
      setInteraction((current) => {
        if (!current) return null;
        persistInteraction(current);
        return null;
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [activeTaskId, persistInteraction, timelineRange.start, timelineRange.end, totalRangeMs]);

  useEffect(() => {
    if (!selectedWorkOrderId) return;
    const channelName = `scheduler-board:${selectedWorkOrderId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scheduling_tasks" },
        (payload) => {
          const record = payload.new ?? payload.old;
          if (!isRealtimeSchedulingTaskRecord(record) || record.work_order_id !== selectedWorkOrderId) {
            return;
          }
          setTasks((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((task) => task.id !== record.id);
            }
            const incoming = record as SchedulingTaskWithRefs;
            const exists = prev.some((task) => task.id === incoming.id);
            if (exists) {
              return prev.map((task) => (task.id === incoming.id ? { ...task, ...incoming } : task));
            }
            return [...prev, incoming];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedWorkOrderId, supabase]);

  const scheduledCount = scheduledTasks.length;
  const machineSummary = useMemo(() => {
    const machines = new Set<string>();
    scheduledTasks.forEach((task) => {
      if (task.machines?.name) {
        machines.add(task.machines.name);
      }
    });
    return machines.size;
  }, [scheduledTasks]);
  const workerSummary = useMemo(() => {
    const workers = new Set<string>();
    scheduledTasks.forEach((task) => {
      if (task.workers?.name) {
        workers.add(task.workers.name);
      }
    });
    return workers.size;
  }, [scheduledTasks]);
  const machineShiftMap = machineShiftAssignments.reduce<Record<string, Shift>>((map, assignment) => {
    if (assignment.machine_id && assignment.shifts) {
      map[assignment.machine_id] = assignment.shifts;
    }
    return map;
  }, {});
  const workerShiftMap = workerShiftAssignments.reduce<Record<string, Shift>>((map, assignment) => {
    if (assignment.worker_id && assignment.shifts) {
      map[assignment.worker_id] = assignment.shifts;
    }
    return map;
  }, {});
  const nextHoliday = (() => {
    const upcoming = holidays
      .map((holiday) => ({
        ...holiday,
        timestamp: new Date(holiday.date).getTime(),
      }))
      .filter((holiday) => holiday.timestamp >= fallbackTimestamp)
      .sort((a, b) => a.timestamp - b.timestamp);
    return upcoming[0] ?? null;
  })();
  const maintenanceByMachine = maintenanceWindows.reduce<Record<string, MaintenanceWindow[]>>(
    (map, window) => {
      if (!window.machine_id) return map;
      map[window.machine_id] = [...(map[window.machine_id] ?? []), window];
      return map;
    },
    {}
  );
  const hasMaintenanceConflict = (task: SchedulingTaskWithRefs) => {
    if (!task.machine_id || !task.start_time || !task.end_time) return false;
    const windows = maintenanceByMachine[task.machine_id] ?? [];
    const start = new Date(task.start_time).getTime();
    const end = new Date(task.end_time).getTime();
    return windows.some((window) => {
      const windowStart = new Date(window.start_time).getTime();
      const windowEnd = new Date(window.end_time).getTime();
      return start < windowEnd && end > windowStart;
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/40 dark:text-white/60">Visual scheduler</p>
            <h2 className="text-2xl font-semibold">
              {selectedWorkOrderLabel ?? "Select a work order"}
            </h2>
            <p className="text-sm text-black/60 dark:text-white/60">
              Drag and resize tasks to update start and end times. Realtime updates sync across the team.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {selectedWorkOrderId ? (
              <Link
                className="rounded-2xl border border-black/10 px-4 py-2 text-sm font-semibold text-black transition hover:border-black/30 dark:border-white/10 dark:text-white dark:hover:border-white/40"
                href={`/dashboard/scheduling/new?organizationId=${encodeURIComponent(
                  organizationId
                )}&facilityId=${encodeURIComponent(
                  facilityId ?? ""
                )}&workOrderId=${encodeURIComponent(selectedWorkOrderId)}`}
              >
                Add scheduling task
              </Link>
            ) : null}
            <Link
              className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white shadow hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              href="/dashboard/scheduling"
            >
              Open list view
            </Link>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase text-black/60 dark:text-white/60">Scheduled tasks</p>
            <p className="text-2xl font-semibold text-black dark:text-white">{scheduledCount}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase text-black/60 dark:text-white/60">Machines</p>
            <p className="text-2xl font-semibold text-black dark:text-white">{machineSummary}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase text-black/60 dark:text-white/60">Workers</p>
            <p className="text-2xl font-semibold text-black dark:text-white">{workerSummary}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase text-black/60 dark:text-white/60">Shift patterns</p>
            <p className="text-2xl font-semibold text-black dark:text-white">{shifts.length}</p>
            <p className="text-xs text-black/60 dark:text-white/60">Active definitions</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-black/5 px-4 py-3 text-sm">
            <p className="text-xs font-semibold uppercase text-black/60 dark:text-white/60">Next holiday</p>
            <p className="text-base font-semibold text-black dark:text-white">
              {nextHoliday ? `${nextHoliday.name} (${format(new Date(nextHoliday.date), "MMM d")})` : "None scheduled"}
            </p>
            <p className="text-xs text-black/60 dark:text-white/60">Plan around the next closure</p>
          </div>
        </div>
      </div>

      {maintenanceWindows.length ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-black dark:text-white">Planned maintenance</h3>
            <span className="text-xs uppercase tracking-[0.3em] text-black/40 dark:text-white/60">Blocked</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {maintenanceWindows.map((window) => (
              <div
                key={window.id}
                className="rounded-2xl border border-black/10 bg-white/80 p-3 text-sm text-black/70 shadow-sm dark:border-white/10 dark:bg-black/30 dark:text-white/70"
              >
                <div className="font-semibold text-black dark:text-white">
                  {window.machines?.name ?? "Machine"}
                </div>
                <div className="text-[12px] text-black/60 dark:text-white/60">
                  {format(new Date(window.start_time), "MMM d, HH:mm")} → {format(new Date(window.end_time), "MMM d, HH:mm")}
                </div>
                {window.description ? (
                  <p className="mt-1 text-xs">{window.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
        <div className="flex items-center justify-between">
          <p className="text-sm text-black/60 dark:text-white/60">
            Timeline {scheduledTasks.length ? `(${format(new Date(timelineRange.start), "MMM d hh:mm aa")} – ${format(new Date(timelineRange.end), "MMM d hh:mm aa")})` : ""}
          </p>
          <div className="text-xs uppercase tracking-[0.3em] text-black/40 dark:text-white/60">Drag to reschedule</div>
        </div>
        <div
          ref={timelineRef}
          className="mt-4 overflow-x-auto"
        >
          <div className="scheduler-track relative min-w-[640px] overflow-visible rounded-2xl bg-black/5 px-4 py-6">
            <div className="grid grid-cols-7 text-[11px] text-black/60 dark:text-white/60">
              {ticks.map((tick) => (
                <div key={tick.toISOString()} className="py-1 text-center">
                  {format(tick, "MMM d HH:mm")}
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-4">
              {lanes.map((lane) => (
                <div key={lane.id}>
                  <div className="flex items-center justify-between text-xs font-semibold text-black/60 dark:text-white/60">
                    <span>{lane.name}</span>
                    <span>{(laneTasksMap[lane.id] ?? []).length} task(s)</span>
                  </div>
                  <div className="relative mt-2 h-16 rounded-2xl bg-white/60 dark:bg-black/40">
                    <div className="absolute inset-y-0 left-0 right-0">
                      {laneTasksMap[lane.id]?.map((task) => {
                        if (!task.start_time || !task.end_time) return null;
                        const machineShift = task.machine_id ? machineShiftMap[task.machine_id] : null;
                        const workerShift = task.worker_id ? workerShiftMap[task.worker_id] : null;
                        const begin = new Date(task.start_time).getTime();
                        const finish = new Date(task.end_time).getTime();
                        const widthPercent =
                          Math.max((finish - begin) / totalRangeMs, MIN_DURATION_MS / totalRangeMs) * 100;
                        const leftPercent = ((Math.max(begin, timelineRange.start) - timelineRange.start) / totalRangeMs) * 100;
                        return (
                          <div
                            key={task.id}
                            className="absolute top-2 bottom-2 flex cursor-grab items-center justify-between rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-white shadow-lg"
                            style={{
                              left: `${Math.min(100 - widthPercent, Math.max(0, leftPercent))}%`,
                              width: `${Math.min(100, widthPercent)}%`,
                            }}
                            onPointerDown={(event) => startInteraction(task, "move", event)}
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <div className="min-w-0">
                                <div className="truncate">{task.operations?.name ?? "Task"}</div>
                                <div className="mt-1 text-[11px] text-white/80">
                                {task.machines?.name ?? "Machine"}
                                  {machineShift ? (
                                    <span className="ml-2 text-[10px] text-white/70">
                                      {machineShift.name}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-[11px] text-white/80">
                                  {task.workers?.name ?? "Worker"}
                                  {workerShift ? (
                                    <span className="ml-2 text-[10px] text-white/70">
                                      {workerShift.name}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {hasMaintenanceConflict(task) ? (
                                <span className="rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-black">
                                  Maintenance
                                </span>
                              ) : null}
                            </div>
                            <div className="flex gap-2">
                              <div
                                className="w-2 cursor-ew-resize rounded-r-full bg-white/70"
                                onPointerDown={(event) => {
                                  event.stopPropagation();
                                  startInteraction(task, "resize-end", event);
                                }}
                              />
                              <div
                                className="w-2 cursor-ew-resize rounded-l-full bg-white/70"
                                onPointerDown={(event) => {
                                  event.stopPropagation();
                                  startInteraction(task, "resize-start", event);
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {unscheduledTasks.length ? (
        <div className="rounded-2xl border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-black/30">
          <h3 className="text-sm font-semibold text-black dark:text-white">Awaiting assignment</h3>
          <div className="mt-3 space-y-3 text-sm text-black/70 dark:text-white/60">
            {unscheduledTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-black/10 bg-white/50 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-black/20"
              >
                <div className="font-medium">{task.operations?.name ?? "Task"}</div>
                <p className="mt-1 text-xs uppercase tracking-[0.3em] text-black/40 dark:text-white/40">
                  Assign start and end times to move this task onto the timeline.
                </p>
                <p className="mt-1 text-[12px]">
                  Machine: {task.machines?.name ?? "TBD"} · Worker: {task.workers?.name ?? "TBD"}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
