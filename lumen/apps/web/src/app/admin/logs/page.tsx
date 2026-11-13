import type { Metadata } from "next";
import { AuditLogs } from "@/components/admin/AuditLogs";

export const metadata: Metadata = { title: "Activity and Audit Logs" };

export default function AdminLogsPage() {
  return <AuditLogs />;
}
