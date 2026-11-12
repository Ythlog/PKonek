import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata: Metadata = { title: "Categories" };

export default function AdminCategoriesPage() {
  return <ComingSoon title="Categories" description="Manage the complaint categories residents can choose from." />;
}
