import type { Metadata } from "next";
import { Suspense } from "react";
import { ComplaintsWorkspace } from "@/components/staff/ComplaintsWorkspace";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Complaints" };

export default function AdminComplaintsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
      <ComplaintsWorkspace role="pasig_admin" />
    </Suspense>
  );
}
