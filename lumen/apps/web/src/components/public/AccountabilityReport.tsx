"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, CircleCheck, Clock, HandHeart, Inbox, Megaphone } from "lucide-react";
import { CategoryIcon } from "@/components/complaints/CategoryIcon";
import { StatCard } from "@/components/dashboard/StatCard";
import { Alert } from "@/components/ui/Alert";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDuration, percent } from "@/lib/analytics";
import { publicReportService } from "@/lib/api";
import { errorMessage } from "@/lib/api/errors";
import type { PublicGroupStat } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { useCategoryMap } from "@/lib/queries";

type SortKey = "total" | "resolution_rate" | "median_resolution_hours";

function rateTone(rate: number) {
  if (rate >= 0.6) return "bg-status-resolved";
  if (rate >= 0.3) return "bg-accent";
  return "bg-status-rejected";
}

function RateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden className="h-2 w-28 overflow-hidden rounded-full bg-cream">
        <div className={cn("h-full rounded-full", rateTone(rate))} style={{ width: percent(rate) }} />
      </div>
      <span className="font-semibold tabular">{percent(rate)}</span>
    </div>
  );
}

function GroupTable({ title, description, rows, nameHeader, icon }: { title: string; description: string; rows: PublicGroupStat[]; nameHeader: string; icon?: (row: PublicGroupStat) => React.ReactNode }) {
  const [sort, setSort] = useState<SortKey>("total");
  const sorted = [...rows].sort((a, b) => {
    if (sort === "median_resolution_hours") return (a.median_resolution_hours ?? Infinity) - (b.median_resolution_hours ?? Infinity);
    return (b[sort] as number) - (a[sort] as number);
  });
  const header = (key: SortKey, label: string, align = "text-right") => (
    <th scope="col" className={cn("px-3 py-3", align)} aria-sort={sort === key ? (key === "median_resolution_hours" ? "ascending" : "descending") : undefined}>
      <button type="button" onClick={() => setSort(key)} className={cn("inline-flex items-center gap-1 rounded-chip uppercase", sort === key ? "text-brand-700" : "hover:text-ink")}>
        {label}
        <ArrowDownUp aria-hidden size={12} />
      </button>
    </th>
  );
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 pt-5">
        <h2 className="text-xl">{title}</h2>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-xl text-left text-sm">
          <caption className="sr-only">{title}. Select a column heading to sort.</caption>
          <thead className="border-b border-border bg-page text-xs font-semibold tracking-eyebrow text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 uppercase">{nameHeader}</th>
              {header("total", "Reports")}
              {header("resolution_rate", "Resolved", "text-left")}
              {header("median_resolution_hours", "Typical fix time")}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((r) => (
              <tr key={r.key}>
                <th scope="row" className="px-5 py-3 font-semibold text-ink">
                  <span className="inline-flex items-center gap-2">
                    {icon?.(r)}
                    {r.label}
                  </span>
                </th>
                <td className="px-3 py-3 text-right tabular">{r.total}</td>
                <td className="px-3 py-3">
                  <RateBar rate={r.resolution_rate} />
                </td>
                <td className="px-3 py-3 pr-5 text-right tabular">{formatDuration(r.median_resolution_hours)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/** Public, no sign-in: city-wide results, open to everyone. Aggregates only, never personal data. */
export function AccountabilityReport() {
  const categories = useCategoryMap();
  const report = useQuery({ queryKey: ["public-summary"], queryFn: () => publicReportService.summary(), staleTime: 5 * 60_000 });
  const s = report.data;

  return (
    <div className="grid gap-10">
      <section className="relative isolate overflow-hidden bg-brand-700 pb-12 pt-10 sm:pt-14">
        <div aria-hidden className="absolute -right-32 -top-24 -z-10 size-96 rounded-full bg-brand-600/50 blur-3xl" />
        <div className="mx-auto max-w-content px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-accent">Public accountability report</p>
          <h1 className="mt-3 max-w-3xl text-3xl text-white sm:text-4xl">How Pasig City responds to residents</h1>
          <p className="mt-4 max-w-2xl text-lg text-brand-50">
            Every report filed on PKonek counts here: how many came in, how many were fixed, and how long it took, by barangay and by category.
          </p>
          {s && <p className="mt-4 text-sm text-brand-50/80">Updated {formatDateTime(s.generated_at)}</p>}
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-content gap-8 px-4 sm:px-6">
        {report.isError && (
          <Alert tone="info" title="The report isn't available right now">
            {errorMessage(report.error)}
          </Alert>
        )}

        <div className="-mt-20 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Reports filed" value={s && formatNumber(s.total)} loading={report.isPending} icon={<Inbox size={22} strokeWidth={1.75} />} hint={s && `${s.active} still active`} />
          <StatCard label="Resolved" value={s && percent(s.resolution_rate)} loading={report.isPending} tone="success" icon={<CircleCheck size={22} strokeWidth={1.75} />} hint={s && `${s.resolved} of ${s.total} reports`} />
          <StatCard label="Typical time to fix" value={s && formatDuration(s.median_resolution_hours)} loading={report.isPending} tone="warning" icon={<Clock size={22} strokeWidth={1.75} />} hint="Median, from report to fix" />
          <StatCard label="Me Too supports" value={s && formatNumber(s.supports)} loading={report.isPending} tone="accent" icon={<HandHeart size={22} strokeWidth={1.75} />} hint="Residents backing reports" />
        </div>

        {report.isPending && (
          <div aria-busy="true" className="grid gap-4">
            <Skeleton className="h-96 rounded-card" />
          </div>
        )}

        {s && (
          <>
            <GroupTable
              title="By barangay"
              description="Resolved is the share of reports in that barangay that were fixed."
              nameHeader="Barangay"
              rows={s.by_barangay}
            />
            <GroupTable
              title="By category"
              description="Which kinds of problems get fixed, and how fast."
              nameHeader="Category"
              rows={s.by_category}
              icon={(r) => <CategoryIcon code={categories.get(Number(r.key))?.code} size={16} className="text-brand-600" />}
            />

            <section aria-labelledby="recent-fixes" className="grid gap-3">
              <h2 id="recent-fixes" className="text-xl">
                Recently fixed
              </h2>
              {s.recently_resolved.length === 0 ? (
                <Card>
                  <p className="text-muted">Nothing has been fixed yet.</p>
                </Card>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {s.recently_resolved.map((r) => (
                    <li key={r.id}>
                      <Card className="h-full">
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-success-bg px-2.5 py-1 text-xs font-semibold text-success">
                          <CircleCheck aria-hidden size={14} strokeWidth={1.75} />
                          Fixed in {formatDuration(r.hours_to_resolve)}
                        </p>
                        <p className="mt-3 font-semibold leading-snug text-ink">{r.title}</p>
                        <p className="mt-1 text-sm text-muted">
                          {[r.barangay, categories.get(r.category_id)?.name, formatDate(r.resolved_at)].filter(Boolean).join(" · ")}
                        </p>
                      </Card>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        <section className="mb-16 flex flex-col items-start gap-6 rounded-panel bg-cream p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl">See a problem in your barangay?</h2>
            <p className="mt-1 text-muted">Every report helps the city see where to act first.</p>
          </div>
          <Link href="/app/report" className={buttonClasses({ size: "lg" })}>
            <Megaphone aria-hidden size={20} strokeWidth={1.75} />
            Report an issue
          </Link>
        </section>
      </div>
    </div>
  );
}
