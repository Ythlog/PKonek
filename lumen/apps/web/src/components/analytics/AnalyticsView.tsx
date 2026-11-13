"use client";

import { useMemo, useState } from "react";
import { CircleCheck, Clock, HandHeart, Inbox } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageHeader } from "@/components/shell/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { byBarangay, byCategory, countByStatus, dailyTrend, formatDuration, percent, summarizeComplaints } from "@/lib/analytics";
import { errorMessage } from "@/lib/api/errors";
import type { Complaint } from "@/lib/api/types";
import { formatNumber, parseApiDate } from "@/lib/format";
import { BARANGAY_NAMES } from "@/lib/pasig";
import { useCategoryMap, useMapPoints } from "@/lib/queries";
import { BarangayTable, CategoryBars, StatusDonut, TrendChart } from "./charts";

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 0, label: "All time" },
];

export function inRange(items: Complaint[], days: number, now = Date.now()) {
  if (!days) return items;
  const cutoff = now - days * 86_400_000;
  return items.filter((c) => parseApiDate(c.created_at).getTime() >= cutoff);
}

/** Full analytics page (admins see all barangays; officials can use it for theirs). */
export function AnalyticsView({ defaultBarangay = "" }: { defaultBarangay?: string }) {
  const [barangay, setBarangay] = useState(defaultBarangay);
  const [days, setDays] = useState(30);
  const categories = useCategoryMap();
  const all = useMapPoints({ barangay: barangay || undefined });

  const items = useMemo(() => inRange(all.data ?? [], days), [all.data, days]);
  const summary = summarizeComplaints(items);
  const loading = all.isPending;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={barangay ? `Barangay ${barangay}` : "All of Pasig City"}
        title="Analytics"
        description="How many complaints come in, what they're about, and how quickly they get fixed."
        actions={
          <div className="flex flex-wrap gap-3">
            <div className="w-44">
              <label htmlFor="analytics-range" className="sr-only">Time range</label>
              <Select id="analytics-range" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {RANGES.map((r) => (
                  <option key={r.days} value={r.days}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-44">
              <label htmlFor="analytics-barangay" className="sr-only">Barangay</label>
              <Select id="analytics-barangay" value={barangay} onChange={(e) => setBarangay(e.target.value)}>
                <option value="">All barangays</option>
                {BARANGAY_NAMES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
      />

      {all.isError && <Alert tone="danger" title="We couldn't load complaints">{errorMessage(all.error)}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Complaints" value={formatNumber(summary.total)} loading={loading} icon={<Inbox size={22} strokeWidth={1.75} />} hint={`${summary.active} still active`} />
        <StatCard label="Resolution rate" value={percent(summary.resolutionRate)} loading={loading} tone="success" icon={<CircleCheck size={22} strokeWidth={1.75} />} hint={`${summary.resolved} resolved`} />
        <StatCard label="Typical time to fix" value={formatDuration(summary.medianResolutionHours)} loading={loading} tone="warning" icon={<Clock size={22} strokeWidth={1.75} />} hint={`Average ${formatDuration(summary.avgResolutionHours)}`} />
        <StatCard label="Me Too supports" value={formatNumber(summary.supports)} loading={loading} tone="accent" icon={<HandHeart size={22} strokeWidth={1.75} />} hint="Residents backing reports" />
      </div>

      {loading ? (
        <div aria-busy="true" className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-card lg:col-span-2" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <TrendChart data={dailyTrend(items, days || 90)} days={days || 90} />
            <StatusDonut data={countByStatus(items)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryBars data={byCategory(items, categories)} />
            {!barangay && <BarangayTable data={byBarangay(items)} />}
          </div>
        </>
      )}
    </div>
  );
}
