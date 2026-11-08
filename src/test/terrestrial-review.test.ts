import { describe, expect, it } from "vitest";
import summary from "@/data/terrestrial3076-screening-summary.json";
import {
  defaultTerrestrialFilters,
  terrestrialMetricFilters,
  activeTerrestrialMetric,
  terrestrialTier,
  readTerrestrialFilters,
  filterTerrestrial,
  matchesTerrestrialSearch,
  readTerrestrialReviews,
  terrestrialArtifactSchema,
  terrestrialLetter,
  terrestrialReviewKey,
  terrestrialWorkload,
  type TerrestrialReviews,
} from "@/lib/terrestrial-review";

const artifact = terrestrialArtifactSchema.parse({
  issue: 3076,
  scope: summary.scope,
  records: [summary.example],
});
const row = artifact.records[0];
if (!row) throw new Error("Missing reference row");
const unresolved = {
  ...row,
  notice: { ...row.notice, raw: { ...row.notice.raw, terrakey: "unresolved" } },
  matchedFinnishRows: [],
};
describe("Terrestrial expert queue", () => {
  it("orders high RUS before medium POL and low CHN regardless of source order", () => {
    const rows = ["CHN", "POL", "RUS"].map((adm) => ({
      ...row,
      notice: { ...row.notice, raw: { ...row.notice.raw, adm } },
    }));
    expect(
      filterTerrestrial(rows, {}, defaultTerrestrialFilters).map((r) => r.notice.raw.adm),
    ).toEqual(["RUS", "POL", "CHN"]);
    expect(rows.map((r) => r.notice.raw.adm)).toEqual(["CHN", "POL", "RUS"]);
  });
  it.each([
    ["RUS", "high"],
    ["POL", "medium"],
    ["KAZ", "low"],
    ["CHN", "low"],
    ["EST", "unclassified"],
  ])("assigns the selected review tier for %s without geographic calculation", (adm, tier) => {
    expect(terrestrialTier(adm).tier).toBe(tier);
  });
  it("quick filters correspond to outstanding and workflow counts and reset narrower filters", () => {
    const reviews: TerrestrialReviews = {
      [row.notice.raw.terrakey]: { state: "completed", updatedAt: "2026-11-07" },
    };
    expect(
      filterTerrestrial([row, unresolved], reviews, terrestrialMetricFilters("overlap")),
    ).toHaveLength(0);
    expect(
      filterTerrestrial([row, unresolved], reviews, terrestrialMetricFilters("unresolved")),
    ).toEqual([unresolved]);
    expect(
      filterTerrestrial([row, unresolved], reviews, terrestrialMetricFilters("reviewed")),
    ).toEqual([row]);
    expect(activeTerrestrialMetric(terrestrialMetricFilters("reviewed"))).toBe("reviewed");
    expect(activeTerrestrialMetric({ ...terrestrialMetricFilters("reviewed"), tier: "high" })).toBe(
      null,
    );
  });
  it("persists quick-filter selection and restores older filters without tier", () => {
    const filters = terrestrialMetricFilters("unresolved");
    expect(readTerrestrialFilters({ getItem: () => JSON.stringify(filters) })).toEqual(filters);
    const { tier: _tier, ...old } = defaultTerrestrialFilters;
    expect(readTerrestrialFilters({ getItem: () => JSON.stringify(old) }).tier).toBe("all");
  });
  it("filters high-tier rows while retaining unclassified rows outside the tier", () => {
    const russian = { ...row, notice: { ...row.notice, raw: { ...row.notice.raw, adm: "RUS" } } };
    expect(
      filterTerrestrial([row, russian], {}, { ...defaultTerrestrialFilters, tier: "high" }),
    ).toEqual([russian]);
  });
  it("retains the 200 overlap / 1658 unresolved scope from preparation", () => {
    expect(summary.metrics.excelOverlapRows).toBe(200);
    expect(
      summary.metrics.foreignLandMobilePublicationRows - summary.metrics.excelOverlapRows,
    ).toBe(1658);
    expect(summary.metrics.overlapAdministrations).toEqual({ KAZ: 157, RUS: 25, CHN: 9, POL: 9 });
  });
  it("selects exact administration and keeps no-overlap rows accessible", () => {
    expect(
      filterTerrestrial(
        [row, unresolved],
        {},
        { ...defaultTerrestrialFilters, administration: "POL" },
      ),
    ).toHaveLength(1);
    expect(
      filterTerrestrial([row], {}, { ...defaultTerrestrialFilters, administration: "P" }),
    ).toHaveLength(0);
    expect(
      filterTerrestrial(
        [row, unresolved],
        {},
        { ...defaultTerrestrialFilters, relevance: "no-overlap" },
      ),
    ).toEqual([unresolved]);
  });
  it("searches source terrakey, site and frequency inside a reported interval", () => {
    expect(matchesTerrestrialSearch(row, "92817506")).toBe(true);
    expect(matchesTerrestrialSearch(row, "OLS0501")).toBe(true);
    expect(matchesTerrestrialSearch(row, "803 MHz")).toBe(true);
    expect(matchesTerrestrialSearch(row, "900 MHz")).toBe(false);
  });
  it("removes reviewed workload without modifying evidence and restores reopening", () => {
    const reviews: TerrestrialReviews = {
      [row.notice.raw.terrakey]: { state: "completed", updatedAt: "2026-11-07" },
      unresolved: { state: "completed", updatedAt: "2026-11-07" },
    };
    expect(terrestrialWorkload([row, unresolved], reviews)).toEqual({
      overlap: 0,
      unresolved: 0,
      inReview: 0,
      reviewed: 2,
    });
    expect(
      terrestrialWorkload([row, unresolved], {
        ...reviews,
        [row.notice.raw.terrakey]: { state: "unreviewed", updatedAt: "2026-11-07" },
      }).overlap,
    ).toBe(1);
    expect(row.matchedFinnishRows).toHaveLength(3);
  });
  it("restores versioned browser state and rejects invalid states", () => {
    const valid = {
      version: 1,
      reviews: { "92817506": { state: "in-review", updatedAt: "2026-11-07" } },
    };
    const getItem = (key: string) => (key === terrestrialReviewKey ? JSON.stringify(valid) : null);
    expect(readTerrestrialReviews({ getItem })["92817506"]?.state).toBe("in-review");
    expect(
      readTerrestrialReviews({
        getItem: () =>
          JSON.stringify({ version: 1, reviews: { x: { state: "safe", updatedAt: "now" } } }),
      }),
    ).toEqual({});
  });
  it("drafts only selected terrestrial evidence without asserting interference or a distance", () => {
    const draft = terrestrialLetter(row, new Date("2026-11-07T00:00:00Z"));
    expect(draft).toContain("notice 92817506");
    expect(draft).toContain("Station 987279: 800.7–805.7 MHz");
    expect(draft).toContain("CSV row 480");
    expect(draft).toContain("have not been established");
    expect(draft).not.toContain("Finland therefore does not agree");
    expect(draft).not.toContain("satellite");
  });
});
