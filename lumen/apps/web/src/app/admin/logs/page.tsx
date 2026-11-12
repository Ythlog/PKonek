import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Activity and audit logs" };

export default function AdminLogsPage() {
  return <ComingSoon title="Activity and audit logs" description="Every sign-in, account change and complaint update, with who did it and when." />;
}
