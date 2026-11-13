import type { Metadata } from "next";
import { CommunityMap } from "@/components/map/CommunityMap";

export const metadata: Metadata = { title: "Community map" };

export default function CommunityMapPage() {
  return <CommunityMap />;
}
