import { hasEarlierFilingMatch } from "./filing-changes";
import { isUnreadFiling } from "./detail-review";
import { hasOverlap, matchesTerrestrialSearch, terrestrialTier } from "./terrestrial-review";
import { terrestrialUploadRows } from "./terrestrial-upload";

export type UploadedTerrestrialRow = ReturnType<typeof terrestrialUploadRows>[number];
export const defaultUploadFilters = {
  query: "",
  issue: "all",
  workflow: "all",
  administration: "all",
  relevance: "all",
  tier: "all",
  comparison: "all",
  action: "all",
  source: "all",
};
export type UploadFilters = typeof defaultUploadFilters;

/** Presentation filters only: no evidence changes, inferred actions or calculations. */
export function filterUploadedTerrestrial(rows: UploadedTerrestrialRow[], f: UploadFilters) {
  return rows.filter(({ entry, row, review }) => {
    const state = review?.state ?? "unreviewed";
    const repeated = hasEarlierFilingMatch(review?.changes, entry.artifact.issue);
    return (
      (f.issue === "all" || String(entry.artifact.issue) === f.issue) &&
      (f.workflow === "all" ||
        (f.workflow === "unread"
          ? isUnreadFiling(state, review?.viewedAt)
          : f.workflow === "outstanding"
            ? state !== "completed"
            : state === f.workflow)) &&
      (f.administration === "all" || row.notice.raw.adm === f.administration) &&
      (f.relevance === "all" || (f.relevance === "overlap" ? hasOverlap(row) : !hasOverlap(row))) &&
      (f.tier === "all" || terrestrialTier(row.notice.raw.adm).tier === f.tier) &&
      (f.comparison === "all" ||
        (f.comparison === "new"
          ? !repeated && review?.changes?.status !== "ambiguous"
          : review?.changes?.status === f.comparison)) &&
      (f.action === "all" || row.notice.raw.intent === f.action) &&
      (f.source === "all" ||
        (f.source === "synthetic" ? entry.artifact.synthetic : !entry.artifact.synthetic)) &&
      matchesTerrestrialSearch(row, f.query)
    );
  });
}

export function selectedTerrestrialEvidence(rows: UploadedTerrestrialRow[], selected: string[]) {
  const ids = new Set(selected);
  return rows
    .filter((r) => r.review && ids.has(r.review.id))
    .map(({ entry, row, review }) => ({
      issue: entry.artifact.issue,
      sha256: entry.sha256,
      synthetic: entry.artifact.synthetic,
      scope: entry.artifact.scope,
      record: row,
      changes: review?.changes ? JSON.parse(review.changes.artifactJson) : null,
    }));
}
