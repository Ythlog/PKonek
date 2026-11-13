import type { Metadata } from "next";
import { AccountabilityReport } from "@/components/public/AccountabilityReport";
import { PublicFooter, PublicHeader } from "@/components/public/PublicChrome";
import { SkipLink } from "@/components/shell/SkipLink";

export const metadata: Metadata = {
  title: "City Accountability Report",
  description: "How Pasig City responds to resident reports: resolution rates and fix times by barangay and category.",
};

export default function AccountabilityPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <PublicHeader />
      <main id="main" className="flex-1">
        <AccountabilityReport />
      </main>
      <PublicFooter />
    </div>
  );
}
