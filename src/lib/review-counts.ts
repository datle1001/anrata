export type ReviewCountRow = { id: string; status: string };

export function outstandingCounts(rows: ReviewCountRow[], reviews: Record<string, string>) {
  const counts: Record<string, number> = {
    exceeds: 0,
    "near-limit": 0,
    within: 0,
    "not-calculable": 0,
  };
  for (const row of rows) {
    if (reviews[row.id] === "completed") continue;
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}