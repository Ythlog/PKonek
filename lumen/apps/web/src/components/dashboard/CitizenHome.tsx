"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck, ClipboardList, HandHeart, Map as MapIcon, Megaphone } from "lucide-react";
import { StatCard } from "./StatCard";
import { ComplaintListItem } from "@/components/complaints/ComplaintListItem";
import { PageHeader } from "@/components/shell/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/AuthProvider";
import { greeting } from "@/lib/format";
import { useCategoryMap, useComplaints } from "@/lib/queries";

const actions = [
  { href: "/app/reports", title: "My reports", text: "Follow the status of everything you reported.", icon: ClipboardList },
  { href: "/app/map", title: "Community map", text: "See what neighbors reported and add your Me Too.", icon: MapIcon },
];

export function CitizenHome() {
  const { user } = useAuth();
  const categories = useCategoryMap();
  const mine = useComplaints({ mine: true, page_size: 100 });
  const recent = { ...mine, data: mine.data && { ...mine.data, items: mine.data.items.slice(0, 3) } };
  const impact = mine.data && {
    filed: mine.data.items.length,
    fixed: mine.data.items.filter((c) => c.status === "resolved").length,
    supports: mine.data.items.reduce((s, c) => s + Math.max(c.report_count - 1, 0), 0),
  };
  const firstName = user?.full_name.split(" ")[0] ?? "";

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow={user?.barangay ? `Barangay ${user.barangay}` : "Pasig City"} title={`${greeting()}, ${firstName}`} description="What would you like to do today?" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Link
          href="/app/report"
          className="group relative isolate flex flex-col justify-between gap-6 overflow-hidden rounded-card bg-brand-700 p-6 text-white shadow-card transition-shadow hover:shadow-card-hover lg:row-span-2"
        >
          <span aria-hidden className="absolute -right-10 -top-10 -z-10 size-40 rounded-full bg-brand-600" />
          <span aria-hidden className="flex size-12 items-center justify-center rounded-control bg-accent text-ink">
            <Megaphone size={24} strokeWidth={1.75} />
          </span>
          <span>
            <span className="block text-2xl font-bold tracking-heading">Report an issue</span>
            <span className="mt-2 block text-brand-50">Pin the spot, add a photo, and send it to your barangay in about a minute.</span>
            <span className="mt-5 inline-flex items-center gap-2 font-semibold text-accent">
              Start a report
              <ArrowRight aria-hidden size={18} strokeWidth={1.75} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </span>
        </Link>
        {actions.map(({ href, title, text, icon: Icon }) => (
          <Link key={href} href={href} className="rounded-card">
            <Card interactive className="h-full">
              <CardHeader icon={<Icon size={20} strokeWidth={1.75} />} title={title} description={text} action={<ArrowRight aria-hidden size={18} strokeWidth={1.75} className="text-muted" />} />
            </Card>
          </Link>
        ))}
      </div>

      {impact && (
        <section aria-labelledby="impact-heading">
          <h2 id="impact-heading" className="sr-only">
            Your reports at a glance
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Reports filed" value={impact.filed} icon={<ClipboardList size={22} strokeWidth={1.75} />} />
            <StatCard label="Fixed" value={impact.fixed} tone="success" icon={<CircleCheck size={22} strokeWidth={1.75} />} />
            <StatCard label="Neighbors who said Me Too" value={impact.supports} tone="accent" icon={<HandHeart size={22} strokeWidth={1.75} />} />
          </div>
        </section>
      )}

      <section aria-labelledby="recent-reports">
        <div className="mb-3 flex items-end justify-between gap-4">
          <h2 id="recent-reports" className="text-xl">
            Your recent reports
          </h2>
          <Link href="/app/reports" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>
        <Card padding="none">
          {recent.isPending && (
            <div aria-busy="true" className="grid gap-4 p-5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ))}
            </div>
          )}
          {recent.isError && (
            <div className="p-5">
              <Alert tone="danger" title="We couldn't load your reports">
                {errorMessage(recent.error)}
              </Alert>
            </div>
          )}
          {recent.data && recent.data.items.length === 0 && (
            <EmptyState
              icon={<ClipboardList size={24} strokeWidth={1.75} />}
              title="No reports yet"
              description="When you report an issue, you can follow its progress here."
              action={
                <Link href="/app/report" className={buttonClasses()}>
                  Report an issue
                </Link>
              }
            />
          )}
          {recent.data && recent.data.items.length > 0 && (
            <ul className="divide-y divide-border">
              {recent.data.items.map((c) => (
                <li key={c.id}>
                  <ComplaintListItem complaint={c} categoryName={categories.get(c.category_id)?.name} href={`/app/reports/${c.id}`} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
