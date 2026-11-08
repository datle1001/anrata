import type { ReviewRow } from "@/lib/review";

export type ReviewCategory = "review" | "unresolved";

// Queue relevance only: no imported status, frequency envelope or blocker can
// establish a regulatory exceedance or clear a filing as safe.
export function triageReviewRow(row: ReviewRow): { category: ReviewCategory; label: string; reasons: string[] } {
  const matched = row.matchedRows.length;
  return {
    category: matched > 0 ? "review" : "unresolved",
    label: matched > 0 ? "Review required" : "Unresolved",
    reasons: [
      matched > 0
        ? `Frequency overlap links ${matched} Finnish Excel source ${matched === 1 ? "row" : "rows"}.`
        : "No Excel overlap found; national geographic relevance has not been cleared.",
      row.calculationScope,
      ...row.blockers,
    ],
  };
}