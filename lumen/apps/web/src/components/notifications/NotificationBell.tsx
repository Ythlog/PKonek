"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { api, notificationService } from "@/lib/api";
import type { Notification } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import { NOTIFICATION_STYLE, notificationHref, notificationsPath } from "./notifications";

export const notificationKeys = {
  unread: ["notifications", "unread"] as const,
  list: (params: object) => ["notifications", "list", params] as const,
};

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | "all") => (id === "all" ? notificationService.markAllRead() : notificationService.markRead(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function NotificationItem({ n, onOpen, compact = false }: { n: Notification; onOpen: (n: Notification) => void; compact?: boolean }) {
  const { icon: Icon, tone } = NOTIFICATION_STYLE[n.notification_type] ?? NOTIFICATION_STYLE.STATUS_CHANGED;
  const unread = !n.read_at;
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={cn("flex w-full items-start gap-3 text-left transition-colors hover:bg-page", compact ? "px-4 py-3" : "p-4 sm:px-5", unread && "bg-brand-50/60")}
    >
      <span aria-hidden className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", tone)}>
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block leading-snug text-ink", unread ? "font-semibold" : "font-medium")}>{n.title}</span>
        <span className={cn("mt-0.5 block text-sm text-muted", compact && "line-clamp-2")}>{n.message}</span>
        <span className="mt-1 block text-xs text-muted">{timeAgo(n.created_at)}</span>
      </span>
      {unread && (
        <span className="mt-1.5 flex shrink-0 items-center">
          <span aria-hidden className="size-2.5 rounded-full bg-brand-600" />
          <span className="sr-only">Unread</span>
        </span>
      )}
    </button>
  );
}

/** Bell with unread count and a dropdown of the latest notifications. */
export function NotificationBell() {
  const { role } = useAuth();
  const router = useRouter();
  const enabled = api.capabilities.notifications;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const markRead = useMarkRead();

  const unread = useQuery({ queryKey: notificationKeys.unread, queryFn: () => notificationService.unreadCount(), enabled, refetchInterval: 30_000 });
  const latest = useQuery({ queryKey: notificationKeys.list({ page_size: 5 }), queryFn: () => notificationService.list({ page_size: 5 }), enabled: enabled && open });
  const count = unread.data ?? 0;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!role) return null;
  const allHref = notificationsPath(role);

  function openItem(n: Notification) {
    setOpen(false);
    if (!n.read_at) markRead.mutate(n.id);
    router.push(notificationHref(n, role!));
  }

  const label = count ? `Notifications, ${count} unread` : "Notifications";
  if (!enabled) {
    return (
      <Link href={allHref} aria-label="Notifications" className="flex size-touch items-center justify-center rounded-full text-muted transition-colors hover:bg-page hover:text-ink">
        <Bell aria-hidden size={20} strokeWidth={1.75} />
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-touch items-center justify-center rounded-full text-muted transition-colors hover:bg-page hover:text-ink"
      >
        <Bell aria-hidden size={20} strokeWidth={1.75} />
        {count > 0 && (
          <span aria-hidden className="absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-bold text-white ring-2 ring-surface tabular">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div id={panelId} className="fixed inset-x-3 top-16 z-40 animate-pop-in overflow-hidden rounded-card border border-border bg-surface shadow-popover sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-base">Notifications</h2>
            {count > 0 && (
              <button type="button" onClick={() => markRead.mutate("all")} className="inline-flex min-h-9 items-center gap-1.5 rounded-control px-2 text-sm font-semibold text-brand-600 hover:bg-brand-50">
                <CheckCheck aria-hidden size={16} strokeWidth={1.75} />
                Mark all as read
              </button>
            )}
          </div>
          {latest.isPending && (
            <div aria-busy="true" className="grid gap-3 p-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          )}
          {latest.data && latest.data.items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">You&rsquo;re all caught up.</p>}
          {latest.data && latest.data.items.length > 0 && (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {latest.data.items.map((n) => (
                <li key={n.id}>
                  <NotificationItem n={n} onOpen={openItem} compact />
                </li>
              ))}
            </ul>
          )}
          <Link href={allHref} onClick={() => setOpen(false)} className="block border-t border-border px-4 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-page">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
