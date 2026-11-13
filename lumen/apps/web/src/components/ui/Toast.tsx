"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastTone = "info" | "success" | "warning" | "danger";

export type ToastOptions = {
  tone?: ToastTone;
  title: string;
  description?: string;
  /** Milliseconds before it disappears. 0 keeps it until dismissed. */
  duration?: number;
};

type ToastEntry = Required<Pick<ToastOptions, "tone" | "duration">> & ToastOptions & { id: number };

type ToastApi = { show: (options: ToastOptions) => number; dismiss: (id: number) => void };

const ToastContext = createContext<ToastApi | null>(null);

const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert } as const;
const accents = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
} as const;

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const show = useCallback((options: ToastOptions) => {
    const id = nextId++;
    const entry: ToastEntry = { tone: "info", duration: 5000, ...options, id };
    setToasts((list) => [...list.slice(-3), entry]);
    return id;
  }, []);
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Bottom on mobile (thumb reach), top-right under the header on desktop. */}
      <section
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:w-96"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} dismiss={dismiss} />
        ))}
      </section>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, dismiss }: { toast: ToastEntry; dismiss: (id: number) => void }) {
  const { id, duration } = toast;
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(() => dismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, dismiss]);
  const onDismiss = () => dismiss(id);

  const Icon = icons[toast.tone];
  return (
    <div
      role={toast.tone === "danger" ? "alert" : "status"}
      className="pointer-events-auto flex animate-pop-in items-start gap-3 rounded-card border border-border bg-surface p-4 shadow-popover"
    >
      <Icon aria-hidden size={20} strokeWidth={1.75} className={cn("mt-0.5 shrink-0", accents[toast.tone])} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-sm text-muted">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="-m-2 flex size-touch shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-page hover:text-ink"
      >
        <X aria-hidden size={18} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}
