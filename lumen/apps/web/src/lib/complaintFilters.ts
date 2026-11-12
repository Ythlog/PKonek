import { COMPLAINT_STATUSES, type ComplaintFilters, type ComplaintSort, type ComplaintStatus } from "@/lib/api/types";

/** Filter state for the staff complaint list. Everything lives in the URL so views can be shared. */
export type FilterState = {
  q: string;
  status: ComplaintStatus[];
  category: number | null;
  /** "" = all barangays. */
  barangay: string;
  from: string;
  to: string;
  sort: ComplaintSort;
  page: number;
  selected: number | null;
};

export const PAGE_SIZE = 20;

export const SORT_OPTIONS: Array<{ value: ComplaintSort; label: string }> = [
  { value: "created_at", label: "Newest first" },
  { value: "report_count", label: "Most Me Too" },
  { value: "updated_at", label: "Recently updated" },
];

const SORTS = SORT_OPTIONS.map((s) => s.value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function positiveInt(value: string | null): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Reads filters from the URL. `defaultBarangay` scopes officials to their barangay
 * unless the URL says otherwise ("barangay=all" shows every barangay).
 */
export function parseFilters(params: URLSearchParams, defaultBarangay = ""): FilterState {
  const barangayParam = params.get("barangay");
  return {
    q: (params.get("q") ?? "").slice(0, 200),
    status: params.getAll("status").filter((s): s is ComplaintStatus => (COMPLAINT_STATUSES as string[]).includes(s)),
    category: positiveInt(params.get("category")),
    barangay: barangayParam === null ? defaultBarangay : barangayParam === "all" ? "" : barangayParam,
    from: DATE.test(params.get("from") ?? "") ? params.get("from")! : "",
    to: DATE.test(params.get("to") ?? "") ? params.get("to")! : "",
    sort: SORTS.includes(params.get("sort") as ComplaintSort) ? (params.get("sort") as ComplaintSort) : "created_at",
    page: positiveInt(params.get("page")) ?? 1,
    selected: positiveInt(params.get("selected")),
  };
}

/** Writes filters back to a query string, leaving defaults out to keep URLs short. */
export function filtersToParams(state: FilterState, defaultBarangay = ""): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set("q", state.q.trim());
  state.status.forEach((s) => params.append("status", s));
  if (state.category) params.set("category", String(state.category));
  if (state.barangay !== defaultBarangay) params.set("barangay", state.barangay || "all");
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.sort !== "created_at") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.selected) params.set("selected", String(state.selected));
  return params;
}

/** The API query for a filter state. Search shorter than 2 characters is ignored, like the backend. */
export function toApiFilters(state: FilterState): ComplaintFilters {
  const q = state.q.trim();
  return {
    q: q.length >= 2 ? q : undefined,
    status: state.status.length ? state.status : undefined,
    category_id: state.category ? [state.category] : undefined,
    barangay: state.barangay || undefined,
    date_from: state.from || undefined,
    date_to: state.to || undefined,
    sort: state.sort,
    order: "desc",
    page: state.page,
    page_size: PAGE_SIZE,
  };
}

/** How many filters differ from the defaults, for the "Clear filters" button. */
export function activeFilterCount(state: FilterState, defaultBarangay = ""): number {
  return [
    state.q.trim().length >= 2,
    state.status.length > 0,
    state.category !== null,
    state.barangay !== defaultBarangay,
    Boolean(state.from),
    Boolean(state.to),
  ].filter(Boolean).length;
}
