import type { DisplayStatus } from "@/components/ui/StatusBadge";
import type { Complaint, Verification } from "@/lib/api/types";

/**
 * The status a resident sees. The backend has four statuses; verification adds two views:
 * resolved but not yet confirmed -> "pending_verification", and reopened by the resident -> "reopened".
 */
export function displayStatus(complaint: Complaint, verifications: Verification[], verificationEnabled = true): DisplayStatus {
  if (!verificationEnabled) return complaint.status;
  const mine = verifications.filter((v) => v.complaint_id === complaint.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const latest = mine[0];
  if (complaint.status === "resolved") {
    const confirmedAfterResolve = latest && complaint.resolved_at && latest.created_at >= complaint.resolved_at;
    return confirmedAfterResolve ? "resolved" : "pending_verification";
  }
  if (complaint.status === "open" && latest?.verdict === "rejected") return "reopened";
  return complaint.status;
}

export type ProgressStep = { id: string; label: string; state: "done" | "current" | "upcoming" };

/** Four-step tracker shown on a resident's report. Rejected reports are shown separately. */
export function progressSteps(status: DisplayStatus): ProgressStep[] {
  const order = ["reported", "in_progress", "resolved", "confirmed"] as const;
  const labels = { reported: "Reported", in_progress: "Being worked on", resolved: "Marked fixed", confirmed: "Confirmed by you" };
  const reached: Record<DisplayStatus, number> = {
    open: 0,
    reopened: 0,
    in_progress: 1,
    pending_verification: 2,
    resolved: 3,
    rejected: 0,
  };
  const at = reached[status];
  return order.map((id, i) => ({
    id,
    label: id === "reported" && status === "reopened" ? "Reopened" : labels[id],
    state: i < at || (status === "resolved" && i === at) ? "done" : i === at ? "current" : "upcoming",
  }));
}

const REFERENCE = /^PSG-(\d{4})-(\d{1,6})$/;

/**
 * "PSG-2026-000123" -> 123. The backend builds the reference from the complaint id,
 * so a lookup only needs GET /complaints/{id} plus a check that the reference matches.
 */
export function idFromReference(input: string): number | null {
  const match = input.trim().toUpperCase().replace(/\s+/g, "").match(REFERENCE);
  if (!match) return null;
  const id = Number(match[2]);
  return id > 0 ? id : null;
}

export function normalizeReference(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export type ReportGroup = "active" | "needs_you" | "closed";

export function groupFor(status: DisplayStatus): ReportGroup {
  if (status === "pending_verification") return "needs_you";
  if (status === "resolved" || status === "rejected") return "closed";
  return "active";
}
