"use client";

import { useEffect } from "react";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export default function Drawer({ open, onClose, title, children }: DrawerProps) {
  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-2xl transition-all dark:bg-black/80">
        <div className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
          {title ? <h3 className="text-lg font-semibold text-black">{title}</h3> : null}
          <button
            type="button"
            className="text-sm font-medium text-black/50 hover:text-black dark:text-white/60 dark:hover:text-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="mt-4 flex-1 space-y-4">{children}</div>
      </div>
    </div>
  );
}
