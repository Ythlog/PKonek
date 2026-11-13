"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Pagination } from "@/components/staff/ComplaintTable";
import { PageHeader } from "@/components/shell/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { logService, userService } from "@/lib/api";
import { errorMessage } from "@/lib/api/errors";
import type { ActivityLog, AuditLog, LogParams } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 25;

/** Same action names as accounts_complaints/services/activity_log.py. */
export const ACTIVITY_ACTIONS: Record<string, { label: string; tone: BadgeTone }> = {
  login_success: { label: "Signed in", tone: "success" },
  login_failed: { label: "Failed sign-in", tone: "danger" },
  logout: { label: "Signed out", tone: "neutral" },
  account_created: { label: "Account created", tone: "brand" },
  role_changed: { label: "Role changed", tone: "warning" },
  deactivated: { label: "Deactivated", tone: "danger" },
  reactivated: { label: "Reactivated", tone: "success" },
  password_changed: { label: "Password changed", tone: "warning" },
};

const AUDIT_ENTITIES = ["complaint", "user", "category", "complaint_response"];

/** "status: open → in_progress, note: Crew assigned" from before/after JSON. */
export function describeChange(before: Record<string, unknown> | null, after: Record<string, unknown> | null): string {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];
  const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return keys
    .filter((k) => show(before?.[k]) !== show(after?.[k]))
    .slice(0, 4)
    .map((k) => (before && k in before ? `${k}: ${show(before[k])} → ${show(after?.[k])}` : `${k}: ${show(after?.[k])}`))
    .join(", ");
}

function DateFilters({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  return (
    <>
      <Field label="From"><Input type="date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} /></Field>
      <Field label="To"><Input type="date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} /></Field>
    </>
  );
}

function useLogs<T>(key: string, params: LogParams, fn: (p: LogParams) => Promise<{ items: T[]; total: number; page: number; page_size: number }>) {
  return useQuery({ queryKey: ["logs", key, params], queryFn: () => fn(params), placeholderData: keepPreviousData });
}

function ActivityTab() {
  const [action, setAction] = useState("");
  const [email, setEmail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const params = { action: action || undefined, email: email.trim() || undefined, date_from: from || undefined, date_to: to || undefined, page, page_size: PAGE_SIZE };
  const logs = useLogs<ActivityLog>("activity", params, (p) => logService.activity(p));
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Action">
          <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All actions</option>
            {Object.entries(ACTIVITY_ACTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
        </Field>
        <Field label="Email" helper="Exact address">
          <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setPage(1); }} placeholder="name@pasig.gov.ph" />
        </Field>
        <DateFilters from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
      </div>
      <LogTable
        loading={logs.isPending}
        error={logs.error}
        rows={logs.data?.items ?? []}
        total={logs.data?.total ?? 0}
        page={page}
        onPage={setPage}
        caption="Account activity"
        headers={["When", "Who", "What", "From"]}
        render={(l) => [
          <time key="t" dateTime={l.created_at}>{formatDateTime(l.created_at)}</time>,
          <span key="w" className="text-ink">{l.email ?? "Unknown"}</span>,
          <span key="a" className="flex flex-wrap items-center gap-2">
            <Badge tone={ACTIVITY_ACTIONS[l.action]?.tone ?? "neutral"}>{ACTIVITY_ACTIONS[l.action]?.label ?? l.action}</Badge>
            {l.details && <span className="text-xs text-muted">{describeChange(null, l.details)}</span>}
          </span>,
          <span key="ip" className="font-mono text-xs text-muted">{l.ip_address ?? "—"}</span>,
        ]}
      />
    </div>
  );
}

function AuditTab() {
  const [entity, setEntity] = useState("");
  const [entityId, setEntityId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const staff = useQuery({ queryKey: ["users", "all-for-logs"], queryFn: () => userService.list({ page_size: 100 }) });
  const names = useMemo(() => new Map((staff.data?.items ?? []).map((u) => [u.id, u.full_name])), [staff.data]);
  const params = { entity_type: entity || undefined, entity_id: Number(entityId) > 0 ? Number(entityId) : undefined, date_from: from || undefined, date_to: to || undefined, page, page_size: PAGE_SIZE };
  const logs = useLogs<AuditLog>("audit", params, (p) => logService.audit(p));
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Record type">
          <Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
            <option value="">All records</option>
            {AUDIT_ENTITIES.map((e) => <option key={e} value={e}>{e.replace("_", " ")}</option>)}
          </Select>
        </Field>
        <Field label="Record ID" hint="Optional">
          <Input inputMode="numeric" value={entityId} onChange={(e) => { setEntityId(e.target.value.replace(/\D/g, "")); setPage(1); }} placeholder="e.g. 12" />
        </Field>
        <DateFilters from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
      </div>
      <LogTable
        loading={logs.isPending}
        error={logs.error}
        rows={logs.data?.items ?? []}
        total={logs.data?.total ?? 0}
        page={page}
        onPage={setPage}
        caption="Audit trail"
        headers={["When", "Who", "Record", "Change"]}
        render={(l) => [
          <time key="t" dateTime={l.created_at}>{formatDateTime(l.created_at)}</time>,
          <span key="w" className="text-ink">{l.actor_user_id ? (names.get(l.actor_user_id) ?? `User #${l.actor_user_id}`) : "Resident or system"}</span>,
          <span key="r" className="flex flex-col">
            <span className="font-semibold text-ink">{l.action.replace(/_/g, " ")}</span>
            <span className="text-xs text-muted">{l.entity_type.replace("_", " ")} #{l.entity_id}</span>
          </span>,
          <span key="c" className="text-xs text-muted">{describeChange(l.before_data, l.after_data) || "—"}</span>,
        ]}
      />
    </div>
  );
}

function LogTable<T extends { id: number }>({ loading, error, rows, total, page, onPage, caption, headers, render }: {
  loading: boolean;
  error: unknown;
  rows: T[];
  total: number;
  page: number;
  onPage: (p: number) => void;
  caption: string;
  headers: string[];
  render: (row: T) => React.ReactNode[];
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      {loading && <div aria-busy="true" className="grid gap-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
      {Boolean(error) && <div className="p-5"><Alert tone="danger" title="We couldn't load the log">{errorMessage(error)}</Alert></div>}
      {!loading && !error && rows.length === 0 && <EmptyState icon={<ScrollText size={24} strokeWidth={1.75} />} title="Nothing logged" description="No entries match these filters." />}
      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl text-left text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="border-b border-border bg-page text-xs font-semibold uppercase tracking-eyebrow text-muted">
                <tr>{headers.map((h) => <th key={h} scope="col" className="px-5 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.id}>{render(row).map((cell, i) => <td key={i} className="px-5 py-3 align-top text-muted">{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={onPage} />
        </>
      )}
    </Card>
  );
}

export function AuditLogs() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Activity and audit logs" description="Every sign-in and account change, and every change to complaints, users and categories, with who did it and when." />
      <Tabs
        label="Log type"
        items={[
          { id: "activity", label: "Account activity", content: <ActivityTab /> },
          { id: "audit", label: "Audit trail", content: <AuditTab /> },
        ]}
      />
    </div>
  );
}
