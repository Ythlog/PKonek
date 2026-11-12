import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Notifications" };

export default function OfficialNotificationsPage() {
  return <ComingSoon title="Notifications" description="New reports, Me Too spikes and resident verifications." />;
}
