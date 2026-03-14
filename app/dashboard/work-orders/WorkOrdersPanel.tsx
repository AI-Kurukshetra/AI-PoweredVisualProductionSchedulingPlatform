"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useToast } from "@/app/components/Toaster";
import { deleteWorkOrderAction } from "./actions";
import { WorkOrderWithProduct } from "@/lib/services/work-orders";

type WorkOrdersPanelProps = {
  workOrders: WorkOrderWithProduct[];
  organizationId: string;
  initialMessage?: string;
  initialError?: string;
};

export default function WorkOrdersPanel({
  workOrders,
  organizationId,
  initialMessage,
  initialError,
}: WorkOrdersPanelProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const formRefs = useRef<Record<string, HTMLFormElement | null>>({});
  const { showToast } = useToast();

  useEffect(() => {
    if (initialMessage) showToast(initialMessage, "success");
    if (initialError) showToast(initialError, "error");
  }, [initialError, initialMessage, showToast]);

  const handleDeleteConfirm = () => {
    if (pendingDelete && formRefs.current[pendingDelete]) {
      formRefs.current[pendingDelete]?.requestSubmit();
    }
  };

  const addLink = `/dashboard/work-orders/new?organizationId=${encodeURIComponent(organizationId)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-black/40 dark:text-white/50">Work orders</p>
          <h1 className="text-3xl font-semibold text-black dark:text-white">Production plan</h1>
        </div>
        <Link
          href={addLink}
          className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
        >
          Add work order
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/80 shadow-sm dark:border-white/10 dark:bg-black/40">
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full text-left text-sm">
            <thead className="bg-black/5 text-xs text-black/60 dark:bg-white/5 dark:text-white/60">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Dependencies</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10 dark:divide-white/10">
              {workOrders.length ? (
                workOrders.map((workOrder) => (
                  <tr key={workOrder.id} className="bg-white/50 dark:bg-black/10">
                    <td className="max-w-[16rem] px-4 py-3 font-medium">
                      <div className="truncate">
                        {workOrder.products?.name ?? "Product"}
                        {workOrder.products?.sku ? (
                          <span className="ml-2 text-xs text-black/50 dark:text-white/50">
                            {workOrder.products.sku}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{workOrder.quantity}</td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{workOrder.priority}</td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">
                      {workOrder.deadline ? new Date(workOrder.deadline).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">{workOrder.status}</td>
                    <td className="px-4 py-3 text-black/70 dark:text-white/70">
                      {workOrder.dependency_ids?.length ? workOrder.dependency_ids.length : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/work-orders/${encodeURIComponent(
                            workOrder.id
                          )}/edit?organizationId=${encodeURIComponent(organizationId)}`}
                          className="rounded-xl px-3 py-2 text-sm text-black/70 transition hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                        >
                          Edit
                        </Link>
                        <ConfirmDialog
                          trigger={
                            <button
                              className="rounded-xl px-3 py-2 text-sm text-black/70 transition hover:bg-black/5 hover:text-black dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
                              type="button"
                              onClick={() => setPendingDelete(workOrder.id)}
                            >
                              Delete
                            </button>
                          }
                          title="Delete work order"
                          description="This will remove the work order permanently."
                          onConfirm={handleDeleteConfirm}
                        />
                        <form
                          ref={(el) => {
                            if (el) formRefs.current[workOrder.id] = el;
                          }}
                          action={deleteWorkOrderAction}
                          className="hidden"
                        >
                          <input type="hidden" name="id" value={workOrder.id} />
                          <input type="hidden" name="organizationId" value={organizationId} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-black/60 dark:text-white/60" colSpan={7}>
                    No work orders yet. Click “Add work order” to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
