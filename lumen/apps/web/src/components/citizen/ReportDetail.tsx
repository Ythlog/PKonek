"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CircleCheck, HandHeart, MapPin, RotateCcw, XCircle } from "lucide-react";
import { CategoryIcon } from "@/components/complaints/CategoryIcon";
import { Timeline } from "@/components/complaints/Timeline";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusBadge, type DisplayStatus } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { api, complaintService } from "@/lib/api";
import { errorMessage, isApiError } from "@/lib/api/errors";
import type { Complaint, VerificationVerdict } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime } from "@/lib/format";
import { queryKeys, useCategoryMap, useComplaint, useComplaints, useMyVerifications, useTimeline } from "@/lib/queries";
import { displayStatus, progressSteps } from "@/lib/tracking";

export function ReportDetail({ id }: { id: number }) {
  const verificationEnabled = api.capabilities.verification;
  const complaint = useComplaint(id);
  const timeline = useTimeline(id);
  const mine = useComplaints({ mine: true, page_size: 100 });
  const verifications = useMyVerifications(verificationEnabled);
  const categories = useCategoryMap();

  if (complaint.isPending) {
    return (
      <div aria-busy="true" className="mx-auto grid max-w-3xl gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }
  if (complaint.isError) {
    return (
      <div className="mx-auto grid max-w-3xl gap-4">
        <BackLink />
        <Alert tone="danger" title={isApiError(complaint.error) && complaint.error.kind === "not_found" ? "We couldn't find this report" : "We couldn't load this report"}>
          {errorMessage(complaint.error)}
        </Alert>
      </div>
    );
  }

  const c = complaint.data as Complaint;
  const isMine = Boolean(mine.data?.items.some((m) => m.id === c.id));
  const status = displayStatus(c, isMine ? (verifications.data ?? []) : [], verificationEnabled && isMine);
  const category = categories.get(c.category_id);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <BackLink />

      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <span className="font-mono text-sm text-muted tabular">{c.reference_no}</span>
          {!isMine && <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold text-muted">Reported by a neighbor</span>}
        </div>
        <h1 className="text-2xl sm:text-3xl">{c.title}</h1>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CategoryIcon code={category?.code} size={16} className="text-brand-600" />
            {category?.name ?? "Unknown category"}
          </span>
          {c.barangay && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden size={16} strokeWidth={1.75} className="text-brand-600" />
              Barangay {c.barangay}
            </span>
          )}
          <span>Reported {formatDate(c.created_at)}</span>
        </p>
      </header>

      {status === "rejected" ? (
        <Alert tone="danger" title="This report was closed without a fix">
          The barangay reviewed it and closed it. Check the updates below for the reason. If the problem is still there, you can file a new report.
        </Alert>
      ) : (
        <ProgressTracker status={status} />
      )}

      {isMine && status === "pending_verification" && <VerifyCard complaint={c} />}

      <Card>
        <div className="grid gap-4">
          <p className="whitespace-pre-line text-ink">{c.description}</p>
          {c.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- evidence served by the API
            <img src={c.photo_url} alt={`Photo of ${c.title}`} className="max-h-80 w-full rounded-card border border-border bg-cream object-contain" />
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
            <span className="text-muted">{c.address_text ?? (c.barangay ? `Barangay ${c.barangay}, Pasig City` : "Pasig City")}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1 font-semibold text-ink tabular">
              <HandHeart aria-hidden size={16} strokeWidth={1.75} />
              {c.report_count === 1 ? "1 person reported this" : `${c.report_count} people reported this`}
            </span>
          </div>
        </div>
      </Card>

      <section aria-labelledby="updates-heading" className="grid gap-3">
        <h2 id="updates-heading" className="text-xl">
          Updates
        </h2>
        <Card>
          {timeline.isPending && <Skeleton className="h-32 w-full" />}
          {timeline.isError && <Alert tone="warning" title="Updates are unavailable">{errorMessage(timeline.error)}</Alert>}
          {timeline.data && <Timeline items={timeline.data} />}
        </Card>
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/app/reports" className="inline-flex w-fit min-h-touch items-center gap-2 rounded-control text-sm font-semibold text-brand-600 hover:text-brand-700">
      <ArrowLeft aria-hidden size={16} strokeWidth={1.75} />
      My Reports
    </Link>
  );
}

function ProgressTracker({ status }: { status: DisplayStatus }) {
  const steps = progressSteps(status);
  return (
    <Card padding="sm" className="sm:p-5">
      <ol aria-label="Progress" className="grid grid-cols-4 gap-2">
        {steps.map((step, i) => (
          <li key={step.id} className="relative flex flex-col items-center gap-2 text-center" aria-current={step.state === "current" ? "step" : undefined}>
            {i > 0 && (
              <span aria-hidden className={cn("absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2", step.state === "upcoming" ? "bg-border" : "bg-brand-600")} />
            )}
            <span
              aria-hidden
              className={cn(
                "relative flex size-8 items-center justify-center rounded-full border-2 text-xs font-bold tabular",
                step.state === "done" && "border-brand-600 bg-brand-600 text-white",
                step.state === "current" && "border-accent bg-surface text-ink",
                step.state === "upcoming" && "border-border bg-surface text-muted",
              )}
            >
              {step.state === "done" ? <Check size={16} strokeWidth={2.5} /> : i + 1}
            </span>
            <span className={cn("text-xs font-semibold sm:text-sm", step.state === "upcoming" ? "text-muted" : "text-ink")}>
              {step.label}
              <span className="sr-only">{step.state === "done" ? " (done)" : step.state === "current" ? " (current step)" : ""}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function VerifyCard({ complaint }: { complaint: Complaint }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<VerificationVerdict | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (verdict: VerificationVerdict) => complaintService.verify(complaint.id, { verdict, note: note.trim() || null }),
    onSuccess: async (v) => {
      await Promise.all(
        [queryKeys.complaint(complaint.id), queryKeys.timeline(complaint.id), queryKeys.verifications, ["complaints"]].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
      toast.show(
        v.verdict === "confirmed"
          ? { tone: "success", title: "Thanks for confirming the fix", description: `${complaint.reference_no} is now closed.` }
          : { tone: "info", title: "Report reopened", description: "Your barangay will take another look." },
      );
    },
    onError: (e) => setError(isApiError(e) ? (e.fieldErrors.note ?? e.message) : errorMessage(e)),
  });

  function send(verdict: VerificationVerdict) {
    setError(null);
    if (verdict === "rejected" && !note.trim()) return setError("Tell the barangay what is still wrong.");
    mutation.mutate(verdict);
  }

  return (
    <section aria-labelledby="verify-heading" className="rounded-card border-2 border-status-pending-verification/30 bg-status-pending-verification-bg p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface text-status-pending-verification">
          <CircleCheck size={22} strokeWidth={1.75} />
        </span>
        <div>
          <h2 id="verify-heading" className="text-lg text-ink">
            Is It Really Fixed?
          </h2>
          <p className="mt-0.5 text-sm text-ink">
            Your barangay marked this as fixed{complaint.resolved_at ? ` on ${formatDateTime(complaint.resolved_at)}` : ""}. Check the spot, then let them know.
          </p>
        </div>
      </div>

      {mode === null && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button leadingIcon={<Check aria-hidden size={18} strokeWidth={2} />} onClick={() => setMode("confirmed")}>
            Yes, it&rsquo;s fixed
          </Button>
          <Button variant="secondary" leadingIcon={<RotateCcw aria-hidden size={18} strokeWidth={1.75} />} onClick={() => setMode("rejected")}>
            No, reopen it
          </Button>
        </div>
      )}

      {mode !== null && (
        <form
          noValidate
          className="mt-5 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(mode);
          }}
        >
          <Field
            label={mode === "confirmed" ? "Anything to add?" : "What's still wrong?"}
            hint={mode === "confirmed" ? "Optional" : undefined}
            required={mode === "rejected"}
            error={error ?? undefined}
          >
            <Textarea
              rows={3}
              maxLength={500}
              showCount
              autoFocus
              value={note}
              placeholder={mode === "confirmed" ? "e.g. Thanks, it works again." : "e.g. Two of the three lights are still out."}
              onChange={(e) => {
                setNote(e.target.value);
                setError(null);
              }}
            />
          </Field>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="ghost" leadingIcon={<XCircle aria-hidden size={18} strokeWidth={1.75} />} onClick={() => setMode(null)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant={mode === "confirmed" ? "primary" : "danger"} loading={mutation.isPending}>
              {mode === "confirmed" ? "Confirm the fix" : "Reopen the report"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
