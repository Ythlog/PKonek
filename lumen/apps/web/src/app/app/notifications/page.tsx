import type { Metadata } from "next";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";

export const metadata: Metadata = { title: "Notifications" };

export default function CitizenNotificationsPage() {
  return <NotificationCenter />;
}
