import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "brand" | "accent" | "info" | "success" | "warning" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-cream text-ink",
  brand: "bg-brand-50 text-brand-700",
  accent: "bg-accent text-ink",
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone };

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular",
        tones[tone],
        className,
      )}
    />
  );
}
