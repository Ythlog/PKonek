import { cn } from "@/lib/cn";
import { statusTokens } from "@/lib/design-tokens";

/** Backend statuses plus the two planned ones (citizen verification and reopen). */
export type DisplayStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "pending_verification"
  | "reopened";

const byStatus = Object.fromEntries(statusTokens.map((s) => [s.status, s]));

export function statusLabel(status: DisplayStatus): string {
  return byStatus[status]?.label ?? status;
}

type StatusBadgeProps = {
  status: DisplayStatus;
  size?: "sm" | "md";
  className?: string;
};

export function StatusBadge({ status, size = "md", className }: StatusBadgeProps) {
  const token = byStatus[status];
  return (
    <span
      data-status={status}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        token?.pill,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", token?.dot)} />
      <span>{token?.label ?? status}</span>
    </span>
  );
}
