import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Community map" };

export default function CommunityMapPage() {
  return <ComingSoon title="Community map" description="See what your neighbors reported and add your Me Too." />;
}
