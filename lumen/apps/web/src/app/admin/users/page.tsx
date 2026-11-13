import type { Metadata } from "next";
import { UserManagement } from "@/components/admin/UserManagement";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return <UserManagement />;
}
