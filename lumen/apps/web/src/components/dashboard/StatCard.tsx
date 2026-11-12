import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

type Tone = "brand" | "info" | "warning" | "success" | "accent";

const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-600",
  info: "bg-info-bg text-info",
  warning: "bg-warning-bg text-warning",
  success: "bg-success-bg text-success",
  accent: "bg-accent/20 text-ink",
};

type StatCardProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: Tone;
  hint?: ReactNode;
  loading?: boolean;
};

export function StatCard({ label, value, icon, tone = "brand", hint, loading = false }: StatCardProps) {
  return (
    <Card padding="sm" className="flex items-start gap-4 sm:p-5">
      <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-control", tones[tone])}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-16" />
        ) : (
          <p className="mt-0.5 text-3xl font-bold tracking-heading text-ink tabular">{value}</p>
        )}
        {hint && !loading && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </div>
    </Card>
  );
}
