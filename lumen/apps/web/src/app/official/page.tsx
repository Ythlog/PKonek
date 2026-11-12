import type { Metadata } from "next";
import { StaffHome } from "@/components/dashboard/StaffHome";

export const metadata: Metadata = { title: "Dashboard" };

export default function OfficialDashboardPage() {
  return <StaffHome role="official" />;
}
