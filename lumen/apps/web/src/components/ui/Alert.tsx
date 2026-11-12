import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

const tones: Record<AlertTone, { box: string; icon: typeof Info }> = {
  info: { box: "border-info/25 bg-info-bg text-info", icon: Info },
  success: { box: "border-success/25 bg-success-bg text-success", icon: CircleCheck },
  warning: { box: "border-warning/25 bg-warning-bg text-warning", icon: TriangleAlert },
  danger: { box: "border-danger/25 bg-danger-bg text-danger", icon: CircleAlert },
};

type AlertProps = {
  tone?: AlertTone;
  title: ReactNode;
  children?: ReactNode;
  /** Buttons or links under the message. */
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
};

export function Alert({ tone = "info", title, children, action, onDismiss, className }: AlertProps) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-control border p-4", box, className)}>
      <Icon aria-hidden size={20} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 text-sm text-ink">{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-m-2 flex size-touch shrink-0 items-center justify-center rounded-control opacity-80 transition-opacity hover:opacity-100"
        >
          <X aria-hidden size={18} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
