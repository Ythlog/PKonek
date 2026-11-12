import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Map monitoring" };

export default function OfficialMapPage() {
  return <ComingSoon title="Map monitoring" description="See hotspots and where complaints are clustering." />;
}
