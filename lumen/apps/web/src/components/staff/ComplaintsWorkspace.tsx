"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ClipboardList, SearchX } from "lucide-react";
import { PageHeader } from "@/components/shell/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Drawer } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { complaintService } from "@/lib/api";
import { errorMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PAGE_SIZE, activeFilterCount, filtersToParams, parseFilters, toApiFilters, type FilterState } from "@/lib/complaintFilters";
import { formatNumber } from "@/lib/format";
import { queryKeys, useCategories, useCategoryMap, useComplaint } from "@/lib/queries";
import { ComplaintDetail } from "./ComplaintDetail";
import { ComplaintFilterBar } from "./ComplaintFilterBar";
import { ComplaintTable, Pagination } from "./ComplaintTable";

export function ComplaintsWorkspace({ role }: { role: "official" | "pasig_admin" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const defaultBarangay = role === "official" ? (user?.barangay ?? "") : "";

  const state = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString()), defaultBarangay), [searchParams, defaultBarangay]);
  const apiFilters = useMemo(() => toApiFilters(state), [state]);
  const categories = useCategories();
  const categoryMap = useCategoryMap();

  const list = useQuery({
    queryKey: queryKeys.complaints(apiFilters),
    queryFn: () => complaintService.list(apiFilters),
    placeholderData: keepPreviousData,
  });

  const setState = useCallback(
    (patch: Partial<FilterState>) => {
      const next = filtersToParams({ ...state, ...patch }, defaultBarangay).toString();
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [state, defaultBarangay, pathname, router],
  );

  const activeCount = activeFilterCount(state, defaultBarangay);
  const selected = state.selected;
  const selectedComplaint = useComplaint(selected).data;
  const scope = state.barangay ? `Barangay ${state.barangay}` : "All of Pasig City";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={scope}
        title="Complaints"
        description="Filter, open a complaint to update its status, post updates and add progress photos."
      />

      <ComplaintFilterBar
        state={state}
        categories={categories.data ?? []}
        activeCount={activeCount}
        onChange={setState}
        onClear={() => setState({ q: "", status: [], category: null, barangay: defaultBarangay, from: "", to: "", page: 1 })}
      />

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <p className="text-sm text-muted" aria-live="polite">
            {list.data ? (
              <>
                <span className="font-semibold text-ink tabular">{formatNumber(list.data.total)}</span> {list.data.total === 1 ? "complaint" : "complaints"}
                {list.isFetching && <span> · Updating…</span>}
              </>
            ) : (
              "Loading complaints…"
            )}
          </p>
        </div>

        {list.isPending && (
          <div aria-busy="true" className="grid gap-4 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="hidden h-6 w-24 md:block" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        )}

        {list.isError && (
          <div className="p-5">
            <Alert tone="danger" title="We couldn't load complaints" action={<Button size="sm" variant="secondary" onClick={() => list.refetch()}>Try again</Button>}>
              {errorMessage(list.error)}
            </Alert>
          </div>
        )}

        {list.data && list.data.items.length === 0 && (
          <EmptyState
            icon={activeCount ? <SearchX size={24} strokeWidth={1.75} /> : <ClipboardList size={24} strokeWidth={1.75} />}
            title={activeCount ? "No complaints match these filters" : "No complaints yet"}
            description={activeCount ? "Try removing a filter or searching for a different word." : "New reports from residents will appear here."}
            action={activeCount ? <Button variant="secondary" onClick={() => setState({ q: "", status: [], category: null, barangay: defaultBarangay, from: "", to: "", page: 1 })}>Clear filters</Button> : undefined}
          />
        )}

        {list.data && list.data.items.length > 0 && (
          <>
            <ComplaintTable items={list.data.items} categories={categoryMap} selectedId={selected} onOpen={(id) => setState({ selected: id })} />
            <Pagination page={state.page} pageSize={PAGE_SIZE} total={list.data.total} onPage={(page) => setState({ page, selected: null })} />
          </>
        )}
      </Card>

      <Drawer
        open={selected !== null}
        onClose={() => setState({ selected: null })}
        title={selectedComplaint?.reference_no ?? "Complaint details"}
        description={selectedComplaint?.barangay ? `Barangay ${selectedComplaint.barangay}` : undefined}
      >
        {selected !== null && <ComplaintDetail key={selected} id={selected} categories={categoryMap} />}
      </Drawer>
    </div>
  );
}
