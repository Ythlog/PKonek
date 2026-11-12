import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Complaints" };

export default function AdminComplaintsPage() {
  return <ComingSoon title="Complaints" description="Filter, review and update complaints across all 30 barangays." />;
}
