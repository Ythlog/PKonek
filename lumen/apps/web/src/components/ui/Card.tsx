import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Strengthens the shadow on hover. Use for clickable cards. Never moves the card. */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddings = { none: "", sm: "p-4", md: "p-6", lg: "p-8" } as const;

export function Card({ interactive = false, padding = "md", className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-card border border-border bg-surface shadow-card",
        interactive && "transition-shadow duration-200 ease-standard hover:shadow-card-hover",
        paddings[padding],
        className,
      )}
    />
  );
}

type CardHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons or links aligned to the right. */
  action?: ReactNode;
  icon?: ReactNode;
  as?: "h2" | "h3";
  className?: string;
};

export function CardHeader({ title, description, action, icon, as: Heading = "h3", className }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      {icon && (
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Heading className="text-lg leading-snug">{title}</Heading>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
