"use client";

import { useQuery } from "@tanstack/react-query";
import { categoryService, complaintService } from "@/lib/api";
import type { Category, ComplaintFilters } from "@/lib/api/types";

/** Query keys in one place so mutations can invalidate them. */
export const queryKeys = {
  categories: ["categories"] as const,
  complaints: (filters: ComplaintFilters = {}) => ["complaints", filters] as const,
  complaint: (id: number) => ["complaint", id] as const,
  timeline: (id: number) => ["timeline", id] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => categoryService.list(),
    staleTime: 10 * 60_000,
  });
}

/** id -> category, for showing names next to complaints. */
export function useCategoryMap(): Map<number, Category> {
  const { data } = useCategories();
  return new Map((data ?? []).map((c) => [c.id, c]));
}

export function useComplaint(id: number | null) {
  return useQuery({
    queryKey: queryKeys.complaint(id ?? 0),
    queryFn: () => complaintService.get(id!),
    enabled: id !== null,
  });
}

export function useTimeline(id: number | null) {
  return useQuery({
    queryKey: queryKeys.timeline(id ?? 0),
    queryFn: () => complaintService.timeline(id!),
    enabled: id !== null,
  });
}

export function useComplaints(filters: ComplaintFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.complaints(filters),
    queryFn: () => complaintService.list(filters),
    enabled: options.enabled ?? true,
  });
}
