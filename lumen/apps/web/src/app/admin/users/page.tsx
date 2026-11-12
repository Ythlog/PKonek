import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return <ComingSoon title="Users" description="Create official and administrator accounts, change roles, and deactivate accounts." />;
}
