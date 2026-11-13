"use client";

import { useState } from "react";
import Link from "next/link";
import { BellRing, ClipboardList, Plus } from "lucide-react";
import { ComplaintListItem } from "@/components/complaints/ComplaintListItem";
import { PageHeader } from "@/components/shell/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/api/errors";
import { useCategoryMap, useComplaints, useMyVerifications } from "@/lib/queries";
import { displayStatus, groupFor, type ReportGroup } from "@/lib/tracking";
import { ReferenceLookup } from "./ReferenceLookup";

type Tab = "all" | ReportGroup;

const emptyCopy: Record<Tab, { title: string; text: string }> = {
  all: { title: "No Reports Yet", text: "When you report an issue, you can follow it here from the first update to the fix." },
  needs_you: { title: "Nothing to Confirm", text: "When a barangay marks one of your reports as fixed, you'll confirm it here." },
  active: { title: "No Open Reports", text: "Everything you reported has been closed." },
  closed: { title: "No Closed Reports Yet", text: "Fixed and closed reports will appear here." },
};

export function MyReports() {
  const verificationEnabled = api.capabilities.verification;
  // TODO(backend): GET /complaints is staff-only; citizens need GET /complaints?mine=true.
  const reports = useComplaints({ mine: true, page_size: 100 });
  const verifications = useMyVerifications(verificationEnabled);
  const categories = useCategoryMap();
  const [tab, setTab] = useState<Tab>("all");

  const rows = (reports.data?.items ?? []).map((c) => {
    const status = displayStatus(c, verifications.data ?? [], verificationEnabled);
    return { complaint: c, status, group: groupFor(status) };
  });
  const count = (g: Tab) => (g === "all" ? rows.length : rows.filter((r) => r.group === g).length);
  const needsYou = count("needs_you");

  function list(which: Tab) {
    const visible = which === "all" ? rows : rows.filter((r) => r.group === which);
    if (visible.length === 0) {
      return (
        <EmptyState
          icon={<ClipboardList size={24} strokeWidth={1.75} />}
          title={emptyCopy[which].title}
          description={emptyCopy[which].text}
          action={
            which === "all" ? (
              <Link href="/app/report" className={buttonClasses()}>
                Report an Issue
              </Link>
            ) : undefined
          }
        />
      );
    }
    return (
      <ul className="divide-y divide-border">
        {visible.map(({ complaint, status }) => (
          <li key={complaint.id}>
            <ComplaintListItem complaint={complaint} status={status} categoryName={categories.get(complaint.category_id)?.name} href={`/app/reports/${complaint.id}`} />
          </li>
        ))}
      </ul>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "all", label: "All" },
    ...(verificationEnabled ? [{ id: "needs_you" as const, label: "Needs you" }] : []),
    { id: "active", label: "Active" },
    { id: "closed", label: "Closed" },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        title="My reports"
        description="Follow every issue you reported, from the first update to the fix."
        actions={
          <Link href="/app/report" className={buttonClasses()}>
            <Plus aria-hidden size={18} strokeWidth={2} />
            Report an Issue
          </Link>
        }
      />

      {needsYou > 0 && (
        <Alert tone="info" title={needsYou === 1 ? "1 report is waiting for your confirmation" : `${needsYou} reports are waiting for your confirmation`}>
          Your barangay marked {needsYou === 1 ? "it" : "them"} as fixed. Open the report to confirm, or reopen it if the problem is still there.
        </Alert>
      )}

      <Card padding="none" className="overflow-hidden">
        {reports.isPending && (
          <div aria-busy="true" className="grid gap-4 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ))}
          </div>
        )}
        {reports.isError && (
          <div className="p-5">
            <Alert tone="danger" title="We couldn't load your reports">
              {errorMessage(reports.error)}
            </Alert>
          </div>
        )}
        {reports.data && (
          <div className="px-2 pt-2 sm:px-3">
            <Tabs
              label="Filter my reports"
              value={tab}
              onValueChange={(id) => setTab(id as Tab)}
              items={tabs.map((t) => ({ id: t.id, label: t.label, count: count(t.id), content: <div className="-mx-2 sm:-mx-3">{list(t.id)}</div> }))}
            />
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
            <BellRing size={20} strokeWidth={1.75} />
          </span>
          <div className="flex-1">
            <h2 className="text-lg">Track Any Report</h2>
            <p className="mt-0.5 text-sm text-muted">Have a reference number from a neighbor or a printout? Look it up here.</p>
            <div className="mt-4">
              <ReferenceLookup />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
