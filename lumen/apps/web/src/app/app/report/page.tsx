import type { Metadata } from "next";
import { ReportWizard } from "@/components/report/ReportWizard";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Report an Issue" };

export default function ReportPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        className="mx-auto w-full max-w-3xl"
        title="Report an issue"
        description="It takes about a minute. Your barangay sees it right away."
      />
      <ReportWizard />
    </div>
  );
}
