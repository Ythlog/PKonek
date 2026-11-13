import type { Metadata } from "next";
import { CitizenHome } from "@/components/dashboard/CitizenHome";

export const metadata: Metadata = { title: "Home" };

export default function CitizenHomePage() {
  return <CitizenHome />;
}
