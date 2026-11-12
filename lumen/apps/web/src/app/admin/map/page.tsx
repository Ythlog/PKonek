import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Map monitoring" };

export default function AdminMapPage() {
  return <ComingSoon title="Map monitoring" description="City-wide hotspots and complaint density." />;
}
