import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { REPORT_STEPS, type ReportStepId } from "@/lib/report";

/** Progress through the report wizard. Completed steps can be revisited. */
export function StepIndicator({
  current,
  reachable,
  onSelect,
}: {
  current: ReportStepId;
  /** Steps the user may jump back to. */
  reachable: ReportStepId[];
  onSelect: (step: ReportStepId) => void;
}) {
  const currentIndex = REPORT_STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Report progress">
      <p className="text-sm font-semibold text-muted sm:hidden tabular">
        Step {currentIndex + 1} of {REPORT_STEPS.length}: <span className="text-ink">{REPORT_STEPS[currentIndex].label}</span>
      </p>
      <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream sm:hidden">
        <div className="h-full rounded-full bg-brand-600 transition-all duration-200" style={{ width: `${((currentIndex + 1) / REPORT_STEPS.length) * 100}%` }} />
      </div>
      <ol className="hidden items-center gap-2 sm:flex">
        {REPORT_STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const canJump = !active && reachable.includes(step.id);
          const content = (
            <>
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular transition-colors",
                  active && "bg-brand-600 text-white",
                  done && "bg-brand-50 text-brand-700",
                  !active && !done && "border border-border bg-surface text-muted",
                )}
              >
                {done ? <Check size={14} strokeWidth={2.5} /> : index + 1}
              </span>
              <span className={cn("text-sm font-semibold", active ? "text-ink" : "text-muted")}>{step.label}</span>
            </>
          );
          return (
            <li key={step.id} className="flex flex-1 items-center gap-2 last:flex-none">
              {canJump ? (
                <button
                  type="button"
                  onClick={() => onSelect(step.id)}
                  aria-label={`Back to step ${index + 1}: ${step.label}`}
                  className="flex min-h-touch items-center gap-2 rounded-control pr-1 hover:text-ink"
                >
                  {content}
                </button>
              ) : (
                <span aria-current={active ? "step" : undefined} className="flex min-h-touch items-center gap-2">
                  {content}
                </span>
              )}
              {index < REPORT_STEPS.length - 1 && <span aria-hidden className={cn("h-px flex-1", done ? "bg-brand-600" : "bg-border")} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
