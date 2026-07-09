"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "info" | "success" | "error";
interface Toast {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  info: "border-brand-200 bg-white",
  success: "border-mint-200 bg-white",
  error: "border-red-200 bg-white",
};

const dotStyles: Record<ToastVariant, string> = {
  info: "bg-brand-500",
  success: "bg-mint-500",
  error: "bg-red-500",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback<ToastContextValue["push"]>(
    (toast) => {
      const id = ++counter.current;
      setToasts((prev) => [...prev, { ...toast, id }]);
      // Auto-dismiss după 5s.
      setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm animate-slide-in items-start gap-3 rounded-xl border p-4 shadow-card-hover",
              variantStyles[toast.variant],
            )}
            role="status"
          >
            <span
              className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotStyles[toast.variant])}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-sm text-slate-500">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => remove(toast.id)}
              className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-surface-muted hover:text-slate-600"
              aria-label="Închide notificarea"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast trebuie folosit în interiorul <ToastProvider>");
  return ctx;
}
