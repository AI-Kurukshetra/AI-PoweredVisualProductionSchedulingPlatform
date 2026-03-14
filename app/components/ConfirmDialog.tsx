"use client";

import { useState } from "react";

type ConfirmDialogProps = {
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  onConfirm: () => void;
};

export default function ConfirmDialog({ trigger, title, description, onConfirm }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <span className="inline-flex" onClick={() => setOpen(true)}>
        {trigger}
      </span>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative rounded-2xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-black/80">
        <div className="text-lg font-semibold text-black dark:text-white">{title ?? "Confirm action"}</div>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          {description ?? "Are you sure you want to proceed?"}
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-2xl border border-black/10 px-4 py-2 text-sm text-black hover:bg-black/5 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
