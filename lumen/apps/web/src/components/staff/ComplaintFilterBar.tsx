"use client";

import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { COMPLAINT_STATUSES, type Category, type ComplaintSort } from "@/lib/api/types";
import { statusLabel } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";
import { SORT_OPTIONS, type FilterState } from "@/lib/complaintFilters";
import { BARANGAY_NAMES } from "@/lib/pasig";
import { statusTokens } from "@/lib/design-tokens";

const dots = Object.fromEntries(statusTokens.map((s) => [s.status, s.dot]));

type Props = {
  state: FilterState;
  categories: Category[];
  activeCount: number;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
};

export function ComplaintFilterBar({ state, categories, activeCount, onChange, onClear }: Props) {
  const [q, setQ] = useState(state.q);
  const [showMore, setShowMore] = useState(Boolean(state.from || state.to));

  // Keep the box in sync when the URL changes elsewhere (top-bar search, Clear filters).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror the URL into the input
    setQ(state.q);
  }, [state.q]);

  // Search after a short pause in typing.
  useEffect(() => {
    if (q === state.q) return;
    const timer = setTimeout(() => onChange({ q, page: 1 }), 350);
    return () => clearTimeout(timer);
  }, [q, state.q, onChange]);

  function toggleStatus(status: (typeof COMPLAINT_STATUSES)[number]) {
    const next = state.status.includes(status) ? state.status.filter((s) => s !== status) : [...state.status, status];
    onChange({ status: next, page: 1 });
  }

  return (
    <div className="grid gap-4 rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label htmlFor="complaint-search" className="sr-only">
            Search complaints
          </label>
          <Input
            id="complaint-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search titles and descriptions"
            leadingIcon={<Search size={18} strokeWidth={1.75} />}
            aria-describedby={q.trim().length === 1 ? "search-hint" : undefined}
          />
          {q.trim().length === 1 && (
            <p id="search-hint" className="mt-1 text-xs text-muted">
              Type at least 2 characters.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex">
          <div className="lg:w-48">
            <label htmlFor="filter-category" className="sr-only">Category</label>
            <Select id="filter-category" value={state.category ?? ""} onChange={(e) => onChange({ category: e.target.value ? Number(e.target.value) : null, page: 1 })}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="lg:w-44">
            <label htmlFor="filter-barangay" className="sr-only">Barangay</label>
            <Select id="filter-barangay" value={state.barangay} onChange={(e) => onChange({ barangay: e.target.value, page: 1 })}>
              <option value="">All barangays</option>
              {BARANGAY_NAMES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 sm:col-span-1 lg:w-44">
            <label htmlFor="filter-sort" className="sr-only">Sort by</label>
            <Select id="filter-sort" value={state.sort} onChange={(e) => onChange({ sort: e.target.value as ComplaintSort, page: 1 })}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span id="status-filter-label" className="mr-1 text-sm font-semibold text-muted">
          Status
        </span>
        <div role="group" aria-labelledby="status-filter-label" className="flex flex-wrap gap-2">
          {COMPLAINT_STATUSES.map((s) => {
            const on = state.status.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleStatus(s)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors",
                  on ? "border-brand-600 bg-brand-50 text-brand-700" : "border-border bg-surface text-muted hover:border-brand-600/40 hover:text-ink",
                )}
              >
                <span aria-hidden className={cn("size-2 rounded-full", dots[s])} />
                {statusLabel(s)}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={showMore}
            aria-controls="more-filters"
            leadingIcon={<SlidersHorizontal aria-hidden size={16} strokeWidth={1.75} />}
            onClick={() => setShowMore((v) => !v)}
          >
            Dates
          </Button>
          {activeCount > 0 && (
            <Button variant="secondary" size="sm" leadingIcon={<X aria-hidden size={16} strokeWidth={1.75} />} onClick={onClear}>
              Clear filters ({activeCount})
            </Button>
          )}
        </div>
      </div>

      {showMore && (
        <div id="more-filters" className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:max-w-md">
          <Field label="Reported from">
            <Input type="date" value={state.from} max={state.to || undefined} onChange={(e) => onChange({ from: e.target.value, page: 1 })} />
          </Field>
          <Field label="Reported to">
            <Input type="date" value={state.to} min={state.from || undefined} onChange={(e) => onChange({ to: e.target.value, page: 1 })} />
          </Field>
        </div>
      )}
    </div>
  );
}
