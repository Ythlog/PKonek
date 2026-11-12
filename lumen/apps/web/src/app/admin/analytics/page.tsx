import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Analytics" };

export default function AdminAnalyticsPage() {
  return <ComingSoon title="Analytics" description="Complaints by status, category, barangay and time, plus resolution speed." />;
}
