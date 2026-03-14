"use client";

import { createContext, useContext, useMemo, useState } from "react";

type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

type ToasterContextValue = {
  showToast: (message: string, type?: Toast["type"]) => void;
};

const ToasterContext = createContext<ToasterContextValue | null>(null);

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast["type"] = "success") => {
    setToasts((prev) => [...prev, { id: Date.now(), message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToasterContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "max-w-xs rounded-2xl px-4 py-3 text-sm shadow-lg",
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : toast.type === "error"
                ? "bg-red-50 text-red-900 border border-red-200"
                : "bg-black text-white",
            ].join(" ")}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToasterContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToasterContext);
  if (!context) {
    throw new Error("useToast must be used within a ToasterProvider");
  }
  return context;
}
