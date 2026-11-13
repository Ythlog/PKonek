import { BadgeCheck, Bell, CircleCheck, HandHeart, Megaphone, MessageSquareText, RotateCcw, type LucideIcon } from "lucide-react";
import type { Notification, NotificationType, Role } from "@/lib/api/types";
import { homePathFor } from "@/lib/auth/routes";

export const NOTIFICATION_STYLE: Record<NotificationType, { icon: LucideIcon; tone: string }> = {
  STATUS_CHANGED: { icon: Bell, tone: "bg-warning-bg text-warning" },
  OFFICIAL_RESPONSE: { icon: MessageSquareText, tone: "bg-info-bg text-info" },
  VERIFICATION_REQUESTED: { icon: CircleCheck, tone: "bg-status-pending-verification-bg text-status-pending-verification" },
  COMPLAINT_REOPENED: { icon: RotateCcw, tone: "bg-status-reopened-bg text-status-reopened" },
  COMPLAINT_RESOLVED: { icon: BadgeCheck, tone: "bg-success-bg text-success" },
  NEW_COMPLAINT: { icon: Megaphone, tone: "bg-brand-50 text-brand-600" },
  SUPPORT_ADDED: { icon: HandHeart, tone: "bg-accent/20 text-ink" },
};

/** Where a notification leads: the resident's report page, or the staff complaint drawer. */
export function notificationHref(n: Pick<Notification, "complaint_id">, role: Role): string {
  const base = homePathFor(role);
  if (!n.complaint_id) return `${base}/notifications`;
  return role === "citizen" ? `/app/reports/${n.complaint_id}` : `${base}/complaints?selected=${n.complaint_id}`;
}

export const notificationsPath = (role: Role) => `${homePathFor(role)}/notifications`;
