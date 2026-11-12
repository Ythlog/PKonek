import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "My reports" };

export default function MyReportsPage() {
  return <ComingSoon title="My reports" description="Follow every issue you reported, from the first update to the fix." />;
}
