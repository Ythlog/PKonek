"use client";

import type { ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { statusLabel } from "@/components/ui/StatusBadge";
import type { DayCount, GroupStat, StatusCount } from "@/lib/analytics";
import { percent } from "@/lib/analytics";
import type { ComplaintStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { titleCaseChildren } from "@/lib/text";

/** Chart colors read the design tokens through CSS variables. */
const STATUS_COLOR: Record<ComplaintStatus, string> = {
  open: "var(--color-status-open)",
  in_progress: "var(--color-status-in-progress)",
  resolved: "var(--color-status-resolved)",
  rejected: "var(--color-status-rejected)",
};
const AXIS = { fontSize: 12, fill: "var(--color-muted)" };
const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "1px solid var(--color-border)", boxShadow: "0 8px 24px -6px rgb(28 35 33 / 0.12)", fontSize: 13 },
  labelStyle: { color: "var(--color-ink)", fontWeight: 600 },
};

/**
 * Card with a heading, a chart, and a text summary. The chart is hidden from screen
 * readers; the summary carries the same information.
 */
export function ChartCard({ title, summary, children, className, height = "h-64" }: { title: string; summary: string; children: ReactNode; className?: string; height?: string }) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <h3 className="text-lg">{titleCaseChildren(title)}</h3>
      <p className="mt-0.5 text-sm text-muted">{summary}</p>
      <div aria-hidden className={cn("mt-4 w-full", height)}>
        <ResponsiveContainer width="100%" height="100%">
          {children as never}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function StatusDonut({ data }: { data: StatusCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const rows = data.filter((d) => d.count > 0);
  return (
    <ChartCard title="By status" summary={rows.map((d) => `${statusLabel(d.status)} ${d.count}`).join(", ") || "No complaints"}>
      <PieChart>
        <Pie data={rows} dataKey="count" nameKey="status" innerRadius="58%" outerRadius="85%" paddingAngle={2} stroke="var(--color-surface)" strokeWidth={2}>
          {rows.map((d) => (
            <Cell key={d.status} fill={STATUS_COLOR[d.status]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(value, name) => [`${value} of ${total}`, statusLabel(name as ComplaintStatus)]} />
        <Legend formatter={(value) => <span className="text-sm text-ink">{statusLabel(value as ComplaintStatus)}</span>} iconType="circle" />
      </PieChart>
    </ChartCard>
  );
}

export function TrendChart({ data, days }: { data: DayCount[]; days: number }) {
  const reported = data.reduce((s, d) => s + d.reported, 0);
  const resolved = data.reduce((s, d) => s + d.resolved, 0);
  const label = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  return (
    <ChartCard title={`Last ${days} days`} summary={`${reported} reported, ${resolved} resolved`} className="lg:col-span-2">
      <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="fill-reported" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-600)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-brand-600)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="date" tickFormatter={label} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} labelFormatter={(d) => label(String(d))} />
        <Legend iconType="circle" formatter={(v) => <span className="text-sm text-ink">{v === "reported" ? "Reported" : "Resolved"}</span>} />
        <Area type="monotone" dataKey="reported" stroke="var(--color-brand-600)" strokeWidth={2} fill="url(#fill-reported)" />
        <Area type="monotone" dataKey="resolved" stroke="var(--color-status-resolved)" strokeWidth={2} fill="transparent" />
      </AreaChart>
    </ChartCard>
  );
}

export function CategoryBars({ data, className }: { data: GroupStat[]; className?: string }) {
  const top = data.slice(0, 8);
  return (
    <ChartCard
      title="By category"
      summary={top.length ? `Most reported: ${top[0].label} (${top[0].total})` : "No complaints"}
      className={className}
      height="h-72"
    >
      <BarChart data={top} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} stroke="var(--color-border)" />
        <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={140} tick={{ ...AXIS, fill: "var(--color-ink)" }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--color-brand-50)" }} />
        <Bar dataKey="active" name="Active" stackId="a" fill="var(--color-status-in-progress)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="resolved" name="Resolved" stackId="a" fill="var(--color-status-resolved)" radius={[0, 6, 6, 0]} />
        <Legend iconType="circle" formatter={(v) => <span className="text-sm text-ink">{v}</span>} />
      </BarChart>
    </ChartCard>
  );
}

/** Table, not a chart: 30 barangays read better as rows with a rate bar. */
export function BarangayTable({ data, title = "By barangay" }: { data: GroupStat[]; title?: string }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 pt-5">
        <h3 className="text-lg">{titleCaseChildren(title)}</h3>
        <p className="mt-0.5 text-sm text-muted">Resolution rate is resolved complaints out of all complaints.</p>
      </div>
      <div className="mt-3 max-h-96 overflow-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{title}</caption>
          <thead className="sticky top-0 border-b border-border bg-page text-xs font-semibold uppercase tracking-eyebrow text-muted">
            <tr>
              <th scope="col" className="px-5 py-2.5">Barangay</th>
              <th scope="col" className="px-3 py-2.5 text-right">Total</th>
              <th scope="col" className="px-3 py-2.5 text-right">Active</th>
              <th scope="col" className="px-5 py-2.5">Resolved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((b) => (
              <tr key={b.key}>
                <th scope="row" className="px-5 py-2.5 font-semibold text-ink">{b.label}</th>
                <td className="px-3 py-2.5 text-right tabular">{b.total}</td>
                <td className="px-3 py-2.5 text-right tabular">{b.active}</td>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-3">
                    <div aria-hidden className="h-2 w-24 overflow-hidden rounded-full bg-cream">
                      <div className="h-full rounded-full bg-status-resolved" style={{ width: percent(b.resolutionRate) }} />
                    </div>
                    <span className="tabular">{percent(b.resolutionRate)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
