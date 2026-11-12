"use client";

import Link from "next/link";
import { CircleCheck, CircleDot, HandHeart, Hourglass, ListChecks } from "lucide-react";
import { ComplaintListItem } from "@/components/complaints/ComplaintListItem";
import { PageHeader } from "@/components/shell/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorMessage } from "@/lib/api/errors";
import type { ComplaintStaff } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homePathFor } from "@/lib/auth/routes";
import { formatNumber, greeting } from "@/lib/format";
import { useCategoryMap, useComplaints } from "@/lib/queries";
import { StatCard } from "./StatCard";

export function summarize(items: ComplaintStaff[]) {
  const count = (status: ComplaintStaff["status"]) => items.filter((c) => c.status === status).length;
  const active = items.filter((c) => c.status === "open" || c.status === "in_progress");
  return {
    open: count("open"),
    inProgress: count("in_progress"),
    resolved: count("resolved"),
    supports: items.reduce((sum, c) => sum + Math.max(c.report_count - 1, 0), 0),
    needsAttention: [...active].sort((a, b) => b.report_count - a.report_count || a.created_at.localeCompare(b.created_at)).slice(0, 5),
  };
}

/**
 * Starting point for officials (their barangay) and admins (the whole city).
 * Task 12 adds charts and analytics on top of this.
 */
export function StaffHome({ role }: { role: "official" | "pasig_admin" }) {
  const { user } = useAuth();
  const categories = useCategoryMap();
  const scopedToBarangay = role === "official" && user?.barangay ? user.barangay : undefined;
  // TODO(backend): an aggregate endpoint would avoid loading 100 rows for the counts.
  const complaints = useComplaints({ barangay: scopedToBarangay, page_size: 100 });
  const stats = complaints.data ? summarize(complaints.data.items) : null;
  const base = homePathFor(role);
  const firstName = user?.full_name.split(" ")[0] ?? "";
  const loading = complaints.isPending;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={scopedToBarangay ? `Barangay ${scopedToBarangay}` : "All of Pasig City"}
        title={`${greeting()}, ${firstName}`}
        description={scopedToBarangay ? "Here is what needs your attention in your barangay." : "Here is the city-wide picture today."}
        actions={
          <Link href={`${base}/complaints`} className={buttonClasses()}>
            <ListChecks aria-hidden size={18} strokeWidth={1.75} />
            Open complaints list
          </Link>
        }
      />

      {complaints.isError && (
        <Alert tone="danger" title="We couldn't load complaints">
          {errorMessage(complaints.error)}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={stats?.open} loading={loading} tone="info" icon={<CircleDot size={22} strokeWidth={1.75} />} hint="Waiting for action" />
        <StatCard label="In progress" value={stats?.inProgress} loading={loading} tone="warning" icon={<Hourglass size={22} strokeWidth={1.75} />} hint="Being worked on" />
        <StatCard label="Resolved" value={stats?.resolved} loading={loading} tone="success" icon={<CircleCheck size={22} strokeWidth={1.75} />} hint="Closed as fixed" />
        <StatCard label="Me Too supports" value={stats ? formatNumber(stats.supports) : undefined} loading={loading} tone="accent" icon={<HandHeart size={22} strokeWidth={1.75} />} hint="Residents backing existing reports" />
      </div>

      <section aria-labelledby="needs-attention">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h2 id="needs-attention" className="text-xl">
              Needs attention
            </h2>
            <p className="text-sm text-muted">Active complaints with the most community support.</p>
          </div>
          <Link href={`${base}/complaints`} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
            View all
          </Link>
        </div>
        <Card padding="none">
          {loading && (
            <div aria-busy="true" className="grid gap-4 p-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="grid gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              ))}
            </div>
          )}
          {stats && stats.needsAttention.length === 0 && (
            <EmptyState icon={<CircleCheck size={24} strokeWidth={1.75} />} title="All caught up" description="There are no open or in-progress complaints right now." />
          )}
          {stats && stats.needsAttention.length > 0 && (
            <ul className="divide-y divide-border">
              {stats.needsAttention.map((c) => (
                <li key={c.id}>
                  <ComplaintListItem complaint={c} categoryName={categories.get(c.category_id)?.name} href={`${base}/complaints?selected=${c.id}`} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
