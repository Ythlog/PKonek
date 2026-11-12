import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Report an issue" };

export default function ReportPage() {
  return <ComingSoon title="Report an issue" description="Choose a category, pin the location, describe the problem and add a photo." />;
}
