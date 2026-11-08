export type UploadedFilingFilter = {
  issues: number[];
  administration: string | null;
  filingId: string | null;
  status: string | null;
  lowerMHz: number | null;
  upperMHz: number | null;
  offset: number;
};

export function validateUploadedFilter(filter: UploadedFilingFilter) {
  if (!Number.isInteger(filter.offset) || filter.offset < 0) throw new Error("Offset must be non-negative.");
  if (filter.issues.length > 100 || filter.issues.some((issue) => !Number.isInteger(issue) || issue < 3075))
    throw new Error("Provide valid uploaded issue numbers.");
  for (const frequency of [filter.lowerMHz, filter.upperMHz]) {
    if (frequency !== null && (!Number.isFinite(frequency) || frequency < 0))
      throw new Error("Frequency must be a non-negative MHz value.");
  }
  if (filter.lowerMHz !== null && filter.upperMHz !== null && filter.upperMHz <= filter.lowerMHz)
    throw new Error("Frequency bounds must increase.");
  if (filter.status !== null && !["exceeds", "near-limit", "within", "not-calculable"].includes(filter.status))
    throw new Error("Unknown stored PFD status.");
  return filter;
}