import { describe, expect, it } from "vitest";
import statistics from "@/data/terrestrial3076-match-statistics.json";
import summary from "@/data/terrestrial3076-screening-summary.json";
import { terrestrialArtifactSchema } from "@/lib/terrestrial-review";
import { queryTerrestrialStatistics } from "@/lib/terrestrial-statistics";

const records = terrestrialArtifactSchema.parse({
  issue: 3076,
  scope: statistics.scope,
  records: statistics.exactlyThree.map((record) => ({
    ...summary.example,
    notice: {
      ...summary.example.notice,
      source: record.source,
      raw: { ...summary.example.notice.raw, terrakey: record.id, adm: record.administration },
    },
  })),
}).records;
const filter = { administration: null, matchedRowCount: 3, tier: "all", query: "", offset: 0 };

describe("Complete terrestrial match statistics", () => {
  it("retains the offline distribution and thirteen source-backed identities", () => {
    expect(statistics.distribution).toEqual({ "0": 1658, "1": 100, "2": 86, "3": 13, "5": 1 });
    expect(statistics.totalNotices).toBe(1858);
    expect(new Set(statistics.exactlyThree.map((r) => r.id)).size).toBe(13);
  });
  it("aggregates all thirteen notices before pagination", () => {
    const result = queryTerrestrialStatistics(records, { ...filter, offset: 10 });
    expect(result.total).toBe(13);
    expect(result.records).toHaveLength(3);
    expect(result.administrations).toEqual({ POL: 9, RUS: 2, CHN: 2 });
    expect(result.matchedRowCountDistribution).toEqual({ "3": 13 });
  });
  it("combines exact match count, administration and team tier without a technical verdict", () => {
    expect(queryTerrestrialStatistics(records, { ...filter, administration: "RUS" }).total).toBe(2);
    expect(queryTerrestrialStatistics(records, { ...filter, tier: "medium" }).total).toBe(9);
    expect(queryTerrestrialStatistics(records, { ...filter, matchedRowCount: 2 }).total).toBe(0);
  });
});
