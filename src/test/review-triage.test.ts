import { describe, expect, it } from "vitest";
import { triageReviewRow } from "@/lib/review-triage";
import type { ReviewRow } from "@/lib/review";

const row: ReviewRow = { id: "1", issue: 3076, kind: "terrestrial", name: "Example", administration: "POL", lowerMHz: 801, upperMHz: 806, frequencyRows: 1, groupCount: 1, matchedRows: [], status: "Unverified", classifications: ["FB"], actionRaw: "ADD", source: { file: "brific3076.mdb", table: "fxm_terra", csvRow: 2 }, groupIds: [], blockers: ["Power semantics unresolved"], calculationScope: "No coordination verdict" };

describe("Evidence-based review triage", () => {
  it("retains zero-overlap filings as unresolved rather than safe", () => {
    expect(triageReviewRow(row).category).toBe("unresolved");
  });
  it("treats Excel overlap as review evidence, not high risk", () => {
    expect(triageReviewRow({ ...row, matchedRows: [12, 13] }).category).toBe("review");
  });
  it("does not accept imported risk claims as a regulatory finding", () => {
    expect(triageReviewRow({ ...row, status: "Confirmed exceedance", matchedRows: [] }).category).toBe("unresolved");
  });
  it("does not prioritize one frequency band above another", () => {
    const a = triageReviewRow({ ...row, matchedRows: [12], lowerMHz: 30, upperMHz: 40 });
    const b = triageReviewRow({ ...row, matchedRows: [12], lowerMHz: 3400, upperMHz: 4200 });
    expect(a).toEqual(b);
  });
});