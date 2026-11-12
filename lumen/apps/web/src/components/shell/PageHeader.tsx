import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Small label above the title, e.g. the barangay. */
  eyebrow?: ReactNode;
  /** Buttons aligned right on desktop, below on mobile. */
  actions?: ReactNode;
  className?: string;
};

/** Title block used at the top of every page, for every role. */
export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-eyebrow text-brand-600">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
