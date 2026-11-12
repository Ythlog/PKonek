import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Notifications" };

export default function AdminNotificationsPage() {
  return <ComingSoon title="Notifications" description="Escalations, overdue complaints and account activity." />;
}
