"use client";

import { useParams } from "next/navigation";
import { ReportDetail } from "@/components/citizen/ReportDetail";
import { Alert } from "@/components/ui/Alert";

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return <Alert tone="danger" title="That isn't a valid report link" />;
  }
  return <ReportDetail id={id} />;
}
