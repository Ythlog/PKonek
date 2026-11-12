import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Complaints" };

export default function OfficialComplaintsPage() {
  return <ComingSoon title="Complaints" description="Filter, review and update the complaints in your barangay." />;
}
