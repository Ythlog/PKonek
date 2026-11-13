"use client";

import { HandHeart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { DuplicateCandidate } from "@/lib/api/types";
import { timeAgo } from "@/lib/format";

type DuplicatePanelProps = {
  candidates: DuplicateCandidate[];
  radiusM: number;
  onSupport: (candidate: DuplicateCandidate) => void;
  supportingId: number | null;
  /** The backend refuses a new report of the same category here, so the only way forward is another category. */
  onChangeCategory?: () => void;
  /** True after the backend refused the submission with 409. */
  blocking?: boolean;
};

/**
 * "Similar report nearby". Shown when the duplicate check finds an open report of the
 * same category within the backend radius, so residents add a Me Too instead of a copy.
 */
export function DuplicatePanel({ candidates, radiusM, onSupport, supportingId, onChangeCategory, blocking = false }: DuplicatePanelProps) {
  const count = candidates.length;
  return (
    <section
      aria-labelledby="duplicate-heading"
      aria-live={blocking ? "assertive" : "polite"}
      className="rounded-card border border-accent bg-accent/10 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-control bg-accent text-ink">
          <HandHeart size={20} strokeWidth={1.75} />
        </span>
        <div>
          <h3 id="duplicate-heading" className="text-lg text-ink">
            {count === 1 ? "Someone already reported this nearby" : `${count} similar reports nearby`}
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            {blocking
              ? `An open report of the same kind is within ${Math.round(radiusM)} m of your pin, so a new one can't be filed. Add your Me Too so it gets more attention.`
              : `It's within ${Math.round(radiusM)} m of your pin. Add your Me Too instead of a new report: more support gets it fixed faster.`}
          </p>
        </div>
      </div>

      <ul className="mt-4 grid gap-2">
        {candidates.map((c) => (
          <li key={c.id} className="flex flex-col gap-3 rounded-control border border-border bg-surface p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={c.status} size="sm" />
                <span className="font-mono text-xs text-muted tabular">{c.reference_no}</span>
              </div>
              <p className="mt-1 font-semibold leading-snug text-ink">{c.title}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted">
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden size={14} strokeWidth={1.75} />
                  <span className="tabular">{Math.round(c.distance_m)} m away</span>
                </span>
                <span>{timeAgo(c.created_at)}</span>
                <span className="tabular">
                  {c.report_count} {c.report_count === 1 ? "report" : "reports"}
                </span>
              </p>
            </div>
            <Button
              variant="accent"
              size="sm"
              loading={supportingId === c.id}
              disabled={supportingId !== null && supportingId !== c.id}
              onClick={() => onSupport(c)}
              leadingIcon={<HandHeart aria-hidden size={16} strokeWidth={1.75} />}
              aria-label={`Me Too on ${c.reference_no}: ${c.title}`}
            >
              Me Too
            </Button>
          </li>
        ))}
      </ul>

      {onChangeCategory && (
        <p className="mt-4 text-sm text-muted">
          Not the same problem?{" "}
          <button type="button" onClick={onChangeCategory} className="font-semibold text-brand-600 underline-offset-4 hover:underline">
            Choose a different category
          </button>
        </p>
      )}
    </section>
  );
}
