import { terrestrialTier, type TerrestrialRow } from "@/lib/terrestrial-review";

export type TerrestrialStatisticsFilter = {
  administration: string | null;
  matchedRowCount: number | null;
  tier: string;
  query: string;
  offset: number;
};

/** Aggregates immutable evidence before pagination; never a propagation calculation. */
export function queryTerrestrialStatistics(
  records: TerrestrialRow[],
  filter: TerrestrialStatisticsFilter,
) {
  const rows = records.filter(
    (row) =>
      (!filter.administration || row.notice.raw.adm === filter.administration) &&
      (filter.matchedRowCount === null ||
        row.matchedFinnishRows.length === filter.matchedRowCount) &&
      (filter.tier === "all" || terrestrialTier(row.notice.raw.adm).tier === filter.tier) &&
      JSON.stringify(row.notice.raw).toLowerCase().includes(filter.query.toLowerCase()),
  );
  const distribution: Record<string, number> = {};
  const administrations: Record<string, number> = {};
  for (const row of rows) {
    const count = String(row.matchedFinnishRows.length);
    distribution[count] = (distribution[count] ?? 0) + 1;
    administrations[row.notice.raw.adm] = (administrations[row.notice.raw.adm] ?? 0) + 1;
  }
  return {
    total: rows.length,
    unit: "terrestrial notices (not Finnish Excel rows)",
    matchedRowCountDistribution: distribution,
    administrations,
    nextOffset: filter.offset + 25 < rows.length ? filter.offset + 25 : null,
    records: rows.slice(filter.offset, filter.offset + 25).map((row) => ({
      id: row.notice.raw.terrakey,
      administration: row.notice.raw.adm,
      matchedFinnishRowCount: row.matchedFinnishRows.length,
      matchedFinnishSourceRows: row.matchedFinnishRows.map((match) => match.source),
      geographicReviewPriority: terrestrialTier(row.notice.raw.adm),
      source: row.notice.source,
      screenStatus: row.screenStatus,
    })),
  };
}
