import Link from "next/link";
import { ChevronRight, HandHeart, MapPin } from "lucide-react";
import { StatusBadge, type DisplayStatus } from "@/components/ui/StatusBadge";
import type { Complaint } from "@/lib/api/types";
import { timeAgo } from "@/lib/format";

type ComplaintListItemProps = {
  complaint: Complaint;
  /** Overrides the badge, e.g. "Awaiting verification" for residents. */
  status?: DisplayStatus;
  categoryName?: string;
  href?: string;
  now?: number;
};

/** One complaint in a list: status, title, place, category, Me Too count and age. */
export function ComplaintListItem({ complaint, status, categoryName, href, now }: ComplaintListItemProps) {
  const body = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge status={status ?? complaint.status} size="sm" />
          <span className="font-mono text-xs text-muted tabular">{complaint.reference_no}</span>
        </div>
        <p className="mt-1.5 font-semibold leading-snug text-ink">{complaint.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {complaint.barangay && (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden size={14} strokeWidth={1.75} />
              {complaint.barangay}
            </span>
          )}
          {categoryName && <span>{categoryName}</span>}
          <span>{timeAgo(complaint.created_at, now)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-ink tabular"
          title={`${complaint.report_count} ${complaint.report_count === 1 ? "person has" : "people have"} reported this`}
        >
          <HandHeart aria-hidden size={14} strokeWidth={1.75} />
          {complaint.report_count}
          <span className="sr-only">{complaint.report_count === 1 ? "report" : "reports"}</span>
        </span>
        {href && <ChevronRight aria-hidden size={18} strokeWidth={1.75} className="text-muted" />}
      </div>
    </>
  );

  const className = "flex items-start gap-4 p-4 sm:px-5";
  return href ? (
    <Link href={href} className={`${className} transition-colors hover:bg-page`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
