"use client";

import { ChevronLeft, ChevronRight, HandHeart } from "lucide-react";
import { categoryIcon } from "@/components/complaints/categoryIcons";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Category, ComplaintStaff } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDateTime, formatNumber, timeAgo } from "@/lib/format";

type Props = {
  items: ComplaintStaff[];
  categories: Map<number, Category>;
  selectedId: number | null;
  onOpen: (id: number) => void;
};

function MeToo({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-ink tabular">
      <HandHeart aria-hidden size={14} strokeWidth={1.75} />
      {count}
      <span className="sr-only"> {count === 1 ? "report" : "reports"}</span>
    </span>
  );
}

/** Table on desktop, cards on small screens. Each row opens the detail drawer. */
export function ComplaintTable({ items, categories, selectedId, onOpen }: Props) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Complaints matching the filters</caption>
          <thead className="border-b border-border bg-page text-xs font-semibold uppercase tracking-eyebrow text-muted">
            <tr>
              <th scope="col" className="px-5 py-3">Complaint</th>
              <th scope="col" className="px-3 py-3">Category</th>
              <th scope="col" className="px-3 py-3">Barangay</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-3 py-3 text-right">Me Too</th>
              <th scope="col" className="px-5 py-3 text-right">Reported</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((c) => {
              const category = categories.get(c.category_id);
              const Icon = categoryIcon(category?.code);
              return (
                <tr key={c.id} className={cn("transition-colors hover:bg-page", selectedId === c.id && "bg-brand-50")}>
                  <td className="max-w-md px-5 py-3">
                    <button type="button" onClick={() => onOpen(c.id)} className="block w-full rounded-chip text-left">
                      <span className="block font-mono text-xs text-muted tabular">{c.reference_no}</span>
                      <span className="mt-0.5 block font-semibold text-ink hover:text-brand-700">{c.title}</span>
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-2 text-ink">
                      <Icon aria-hidden size={16} strokeWidth={1.75} className="text-brand-600" />
                      {category?.name ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-ink">{c.barangay ?? "—"}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <MeToo count={c.report_count} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-muted">
                    <time dateTime={c.created_at} title={formatDateTime(c.created_at)}>
                      {timeAgo(c.created_at)}
                    </time>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border md:hidden">
        {items.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onOpen(c.id)}
              className={cn("flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-page", selectedId === c.id && "bg-brand-50")}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={c.status} size="sm" />
                  <span className="font-mono text-xs text-muted tabular">{c.reference_no}</span>
                </div>
                <p className="mt-1.5 font-semibold leading-snug text-ink">{c.title}</p>
                <p className="mt-1 text-sm text-muted">
                  {[c.barangay, categories.get(c.category_id)?.name, timeAgo(c.created_at)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <MeToo count={c.report_count} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-border px-5 py-3 sm:flex-row">
      <p className="text-sm text-muted tabular">
        Showing {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} leadingIcon={<ChevronLeft aria-hidden size={16} />}>
          Previous
        </Button>
        <span className="text-sm text-muted tabular" aria-current="page">
          Page {page} of {pages}
        </span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} trailingIcon={<ChevronRight aria-hidden size={16} />}>
          Next
        </Button>
      </div>
    </nav>
  );
}
