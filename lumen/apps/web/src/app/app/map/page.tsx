import type { Metadata } from "next";
import { CommunityMap } from "@/components/map/CommunityMap";

export const metadata: Metadata = { title: "Community Map" };

export default function CommunityMapPage() {
  return <CommunityMap />;
}
