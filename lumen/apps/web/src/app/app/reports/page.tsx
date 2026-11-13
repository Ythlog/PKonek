import type { Metadata } from "next";
import { MyReports } from "@/components/citizen/MyReports";

export const metadata: Metadata = { title: "My Reports" };

export default function MyReportsPage() {
  return <MyReports />;
}
