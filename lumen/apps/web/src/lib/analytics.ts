import type { Category, Complaint, ComplaintStatus } from "@/lib/api/types";
import { parseApiDate } from "@/lib/format";

/**
 * Complaint statistics computed in the browser from GET /complaints.
 * TODO(backend): person4 has /api/admin/overview and /api/admin/trends/daily on the other schema;
 * switch to them once the team shares one database.
 */

const HOUR = 3_600_000;

export type StatusCount = { status: ComplaintStatus; count: number };
export type GroupStat = { key: string; label: string; total: number; resolved: number; active: number; supports: number; resolutionRate: number };
export type DayCount = { date: string; reported: number; resolved: number };

export function countByStatus(items: Complaint[]): StatusCount[] {
  const statuses: ComplaintStatus[] = ["open", "in_progress", "resolved", "rejected"];
  return statuses.map((status) => ({ status, count: items.filter((c) => c.status === status).length }));
}

function group(items: Complaint[], keyOf: (c: Complaint) => string | null, labelOf: (key: string) => string): GroupStat[] {
  const map = new Map<string, Complaint[]>();
  for (const c of items) {
    const key = keyOf(c);
    if (!key) continue;
    map.set(key, [...(map.get(key) ?? []), c]);
  }
  return [...map.entries()]
    .map(([key, list]) => {
      const resolved = list.filter((c) => c.status === "resolved").length;
      const closed = list.filter((c) => c.status === "resolved" || c.status === "rejected").length;
      return {
        key,
        label: labelOf(key),
        total: list.length,
        resolved,
        active: list.length - closed,
        supports: list.reduce((s, c) => s + Math.max(c.report_count - 1, 0), 0),
        resolutionRate: list.length ? resolved / list.length : 0,
      };
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

export function byCategory(items: Complaint[], categories: Map<number, Category>): GroupStat[] {
  return group(items, (c) => String(c.category_id), (key) => categories.get(Number(key))?.name ?? "Other");
}

export function byBarangay(items: Complaint[]): GroupStat[] {
  return group(items, (c) => c.barangay, (key) => key);
}

/** Hours from report to resolution for resolved complaints. */
export function resolutionHours(items: Complaint[]): number[] {
  return items
    .filter((c) => c.status === "resolved" && c.resolved_at)
    .map((c) => (parseApiDate(c.resolved_at!).getTime() - parseApiDate(c.created_at).getTime()) / HOUR)
    .filter((h) => h >= 0);
}

export function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** "3h", "2.5 days". */
export function formatDuration(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 24) return `${Math.max(1, Math.round(hours))}h`;
  const days = hours / 24;
  return `${days < 10 ? days.toFixed(1).replace(/\.0$/, "") : Math.round(days)} days`;
}

/** Manila calendar date "YYYY-MM-DD" for an API timestamp. */
export function manilaDay(value: string | number): string {
  const d = typeof value === "number" ? new Date(value) : parseApiDate(value);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

/** Reported and resolved per day for the last `days` days, oldest first. */
export function dailyTrend(items: Complaint[], days = 30, now = Date.now()): DayCount[] {
  const out: DayCount[] = [];
  const index = new Map<string, DayCount>();
  for (let i = days - 1; i >= 0; i--) {
    const date = manilaDay(now - i * 24 * HOUR);
    const row = { date, reported: 0, resolved: 0 };
    out.push(row);
    index.set(date, row);
  }
  for (const c of items) {
    const reported = index.get(manilaDay(c.created_at));
    if (reported) reported.reported += 1;
    if (c.resolved_at && c.status === "resolved") {
      const resolved = index.get(manilaDay(c.resolved_at));
      if (resolved) resolved.resolved += 1;
    }
  }
  return out;
}

export type Summary = {
  total: number;
  active: number;
  resolved: number;
  rejected: number;
  supports: number;
  resolutionRate: number;
  avgResolutionHours: number | null;
  medianResolutionHours: number | null;
};

export function summarizeComplaints(items: Complaint[]): Summary {
  const hours = resolutionHours(items);
  const resolved = items.filter((c) => c.status === "resolved").length;
  const rejected = items.filter((c) => c.status === "rejected").length;
  return {
    total: items.length,
    active: items.length - resolved - rejected,
    resolved,
    rejected,
    supports: items.reduce((s, c) => s + Math.max(c.report_count - 1, 0), 0),
    resolutionRate: items.length ? resolved / items.length : 0,
    avgResolutionHours: average(hours),
    medianResolutionHours: median(hours),
  };
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
