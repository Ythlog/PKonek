import type { Metadata } from "next";
import { StaffHome } from "@/components/dashboard/StaffHome";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return <StaffHome role="pasig_admin" />;
}
