import { CircleCheck, CircleDot, HandHeart, Image as ImageIcon, Lock, Megaphone, MessageSquareText, type LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { TimelineItem, TimelineItemType } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { formatDateTime, timeAgo } from "@/lib/format";

const icons: Record<TimelineItemType, { icon: LucideIcon; tone: string }> = {
  created: { icon: Megaphone, tone: "bg-brand-50 text-brand-600" },
  status_change: { icon: CircleDot, tone: "bg-warning-bg text-warning" },
  resolved: { icon: CircleCheck, tone: "bg-success-bg text-success" },
  support: { icon: HandHeart, tone: "bg-accent/20 text-ink" },
  response: { icon: MessageSquareText, tone: "bg-info-bg text-info" },
  media: { icon: ImageIcon, tone: "bg-cream text-ink" },
};

/** Newest-first history of a complaint. Used by residents and staff. */
export function Timeline({ items, now }: { items: TimelineItem[]; now?: number }) {
  return (
    <ol className="relative grid gap-5">
      {items.map((item, index) => {
        const internal = item.type === "response" && item.is_public === false;
        const { icon: Icon, tone } = internal ? { icon: Lock, tone: "bg-cream text-muted" } : icons[item.type];
        return (
          <li key={`${item.timestamp}-${index}`} className="relative flex gap-3">
            {index < items.length - 1 && <span aria-hidden className="absolute -bottom-5 left-4 top-9 w-px bg-border" />}
            <span aria-hidden className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
              <Icon size={16} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="font-semibold text-ink">{item.display_text}</p>
                {item.status && item.type !== "created" && <StatusBadge status={item.status} size="sm" />}
                {internal && <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-semibold text-muted">Staff only</span>}
              </div>
              <p className="mt-0.5 text-xs text-muted">
                <time dateTime={item.timestamp} title={formatDateTime(item.timestamp)}>
                  {timeAgo(item.timestamp, now)}
                </time>
                {item.actor_name && <> · {item.actor_name}</>}
              </p>
              {item.detail && (
                <p className={cn("mt-2 whitespace-pre-line rounded-control p-3 text-sm", internal ? "border border-dashed border-border bg-page text-muted" : "bg-page text-ink")}>
                  {item.detail}
                </p>
              )}
              {item.media_url && (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded evidence from the API
                <img src={item.media_url} alt={item.display_text} className="mt-2 max-h-48 rounded-control border border-border object-cover" />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
