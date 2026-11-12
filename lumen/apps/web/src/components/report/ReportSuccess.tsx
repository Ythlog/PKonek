"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, Check, CircleCheck, ClipboardCheck, Copy, HandHeart, Users } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Complaint } from "@/lib/api/types";

export type ReportOutcome =
  | { kind: "created"; complaint: Complaint; photoFailed: string | null }
  | { kind: "supported"; complaint: Complaint };

const nextSteps = [
  { icon: Users, text: "Your barangay sees the report right away." },
  { icon: BellRing, text: "You'll get an update each time the status changes." },
  { icon: ClipboardCheck, text: "When it's marked fixed, you confirm it or reopen it." },
];

export function ReportSuccess({ outcome, onReportAnother }: { outcome: ReportOutcome; onReportAnother: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const { complaint } = outcome;
  const supported = outcome.kind === "supported";

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(complaint.reference_no);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the number is still on screen.
    }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Card padding="lg" className="text-center">
        <span aria-hidden className={`mx-auto flex size-16 animate-pop-in items-center justify-center rounded-full ${supported ? "bg-accent text-ink" : "bg-success-bg text-success"}`}>
          {supported ? <HandHeart size={32} strokeWidth={1.75} /> : <CircleCheck size={32} strokeWidth={1.75} />}
        </span>
        <h2 ref={headingRef} tabIndex={-1} className="mt-5 text-2xl outline-none sm:text-3xl">
          {supported ? "Your Me Too was added" : "Report sent. Thank you!"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-muted">
          {supported
            ? `${complaint.report_count} residents have now reported "${complaint.title}". More support helps officials decide what to fix first.`
            : "Your barangay can see it now. Keep this reference number to follow its progress."}
        </p>

        <div className="mx-auto mt-6 flex w-fit items-center gap-3 rounded-control border border-border bg-page py-2 pl-4 pr-2">
          <span className="text-sm text-muted">Reference</span>
          <span className="font-mono text-lg font-bold text-brand-700 tabular">{complaint.reference_no}</span>
          <Button variant="ghost" size="sm" onClick={copy} aria-label={copied ? "Reference number copied" : "Copy reference number"} leadingIcon={copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} strokeWidth={1.75} />}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {outcome.kind === "created" && outcome.photoFailed && (
          <Alert tone="warning" title="Your report was sent, but the photo wasn't" className="mt-6 text-left">
            {outcome.photoFailed} You can add it later from your report.
          </Alert>
        )}

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/app/reports" className={buttonClasses()}>
            Go to my reports
          </Link>
          <Button variant="secondary" onClick={onReportAnother}>
            Report another issue
          </Button>
        </div>
      </Card>

      {!supported && (
        <Card>
          <h3 className="text-lg">What happens next</h3>
          <ol className="mt-4 grid gap-4">
            {nextSteps.map(({ icon: Icon, text }, i) => (
              <li key={text} className="flex items-start gap-3">
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="pt-1.5 text-ink">
                  <span className="sr-only">Step {i + 1}: </span>
                  {text}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
