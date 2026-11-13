import { describe, expect, it } from "vitest";
import { activeFilterCount, filtersToParams, parseFilters, toApiFilters } from "./complaintFilters";

const p = (s: string) => new URLSearchParams(s);

describe("complaint filters in the URL", () => {
  it("reads every filter and ignores bad values", () => {
    const state = parseFilters(p("q=drain&status=open&status=bogus&status=in_progress&category=2&from=2026-11-01&to=nope&sort=report_count&page=3&selected=7"));
    expect(state).toEqual({
      q: "drain",
      status: ["open", "in_progress"],
      category: 2,
      barangay: "",
      from: "2026-11-01",
      to: "",
      sort: "report_count",
      page: 3,
      selected: 7,
    });
    expect(parseFilters(p("sort=evil&page=-1&category=x"))).toMatchObject({ sort: "created_at", page: 1, category: null });
  });

  it("scopes officials to their barangay unless the URL asks for all", () => {
    expect(parseFilters(p(""), "Kapitolyo").barangay).toBe("Kapitolyo");
    expect(parseFilters(p("barangay=all"), "Kapitolyo").barangay).toBe("");
    expect(parseFilters(p("barangay=Ugong"), "Kapitolyo").barangay).toBe("Ugong");
  });

  it("round-trips and keeps defaults out of the URL", () => {
    const url = "q=drain&status=open&category=2&barangay=all&sort=report_count&page=2&selected=4";
    expect(filtersToParams(parseFilters(p(url), "Kapitolyo"), "Kapitolyo").toString()).toBe(url);
    expect(filtersToParams(parseFilters(p(""), "Kapitolyo"), "Kapitolyo").toString()).toBe("");
  });

  it("builds the backend query and skips 1-letter searches", () => {
    expect(toApiFilters(parseFilters(p("q=d&status=resolved&category=4&barangay=Ugong&page=2")))).toEqual({
      q: undefined,
      status: ["resolved"],
      category_id: [4],
      barangay: "Ugong",
      date_from: undefined,
      date_to: undefined,
      sort: "created_at",
      order: "desc",
      page: 2,
      page_size: 20,
    });
  });

  it("counts active filters relative to the default scope", () => {
    expect(activeFilterCount(parseFilters(p(""), "Kapitolyo"), "Kapitolyo")).toBe(0);
    expect(activeFilterCount(parseFilters(p("status=open&barangay=all&q=dr"), "Kapitolyo"), "Kapitolyo")).toBe(3);
  });
});
