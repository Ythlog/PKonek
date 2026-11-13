import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { titleCaseChildren } from "@/lib/text";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** The next thing the user can do. */
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {icon && (
        <span aria-hidden className="mb-4 flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {icon}
        </span>
      )}
      <h3 className="text-lg">{titleCaseChildren(title)}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
