"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { BellOff, CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Pagination } from "@/components/staff/ComplaintTable";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { api, notificationService } from "@/lib/api";
import { errorMessage } from "@/lib/api/errors";
import type { Notification } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { notificationKeys, NotificationItem, useMarkRead } from "./NotificationBell";
import { notificationHref } from "./notifications";

const PAGE_SIZE = 20;

const descriptions = {
  citizen: "Status changes, updates from your barangay, and requests to confirm a fix.",
  official: "New reports in your barangay, Me Too spikes, and residents confirming or reopening fixes.",
  pasig_admin: "City-wide alerts: reports gaining support, reopened fixes and new activity.",
} as const;

function List({ unreadOnly }: { unreadOnly: boolean }) {
  const { role } = useAuth();
  const router = useRouter();
  const markRead = useMarkRead();
  const [page, setPage] = useState(1);
  const params = { unread: unreadOnly || undefined, page, page_size: PAGE_SIZE };
  const list = useQuery({ queryKey: notificationKeys.list(params), queryFn: () => notificationService.list(params), placeholderData: keepPreviousData });

  function open(n: Notification) {
    if (!n.read_at) markRead.mutate(n.id);
    if (role) router.push(notificationHref(n, role));
  }

  if (list.isPending) return <div aria-busy="true" className="grid gap-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  if (list.isError) return <div className="p-5"><Alert tone="danger" title="We couldn't load notifications">{errorMessage(list.error)}</Alert></div>;
  if (list.data.items.length === 0) {
    return <EmptyState icon={<BellOff size={24} strokeWidth={1.75} />} title={unreadOnly ? "No unread notifications" : "No notifications yet"} description="Updates about reports will appear here." />;
  }
  return (
    <>
      <ul className="divide-y divide-border">
        {list.data.items.map((n) => <li key={n.id}><NotificationItem n={n} onOpen={open} /></li>)}
      </ul>
      {list.data.total > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={list.data.total} onPage={setPage} />}
    </>
  );
}

export function NotificationCenter() {
  const { role } = useAuth();
  const enabled = api.capabilities.notifications;
  const markRead = useMarkRead();
  const unread = useQuery({ queryKey: notificationKeys.unread, queryFn: () => notificationService.unreadCount(), enabled });

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <PageHeader
        title="Notifications"
        description={role ? descriptions[role] : undefined}
        actions={
          enabled && (unread.data ?? 0) > 0 ? (
            <Button variant="secondary" loading={markRead.isPending} leadingIcon={<CheckCheck aria-hidden size={18} strokeWidth={1.75} />} onClick={() => markRead.mutate("all")}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />
      {!enabled ? (
        // TODO(backend): person4 GET /api/notifications once it shares the accounts database.
        <Alert tone="info" title="Notifications aren't connected yet">They&rsquo;ll appear here once the notifications service shares the main database.</Alert>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="px-2 pt-2 sm:px-3">
            <Tabs
              label="Filter notifications"
              items={[
                { id: "all", label: "All", content: <div className="-mx-2 sm:-mx-3"><List unreadOnly={false} /></div> },
                { id: "unread", label: "Unread", count: unread.data, content: <div className="-mx-2 sm:-mx-3"><List unreadOnly /></div> },
              ]}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
