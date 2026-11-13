import type { Metadata } from "next";
import { CategoryManagement } from "@/components/admin/CategoryManagement";

export const metadata: Metadata = { title: "Categories" };

export default function AdminCategoriesPage() {
  return <CategoryManagement />;
}
