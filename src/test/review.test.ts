import { describe, expect, it } from "vitest";
import { correspondence, parseReviewArtifact, type ReviewRow } from "@/lib/review";

const row: ReviewRow = { id:"1", issue:3076, kind:"terrestrial", name:"2", administration:"POL", lowerMHz:801, upperMHz:806, frequencyRows:1, groupCount:1, matchedRows:[], status:"National relevance unresolved", classifications:["FB"], actionRaw:"ADD", source:{file:"brific3076.mdb",table:"fxm_terra",csvRow:2}, groupIds:[], blockers:["M4"], calculationScope:"No coordination verdict" };
describe("Offline expert review", () => {
  it("accepts other IFIC issues without converting unresolved evidence", () => {
    const parsed = parseReviewArtifact({scope:"offline",rows:[{...row,issue:3080}]});
    expect(parsed.rows[0]?.issue).toBe(3080);
    expect(parsed.rows[0]?.status).toBe("National relevance unresolved");
  });
  it("rejects non-finite frequencies", () => {
    expect(() => parseReviewArtifact({scope:"offline",rows:[{...row,lowerMHz:Infinity}]})).toThrow();
  });
  it("retains zero-overlap cases and excludes unvalidated imported trends", () => {
    const parsed = parseReviewArtifact({scope:"offline",rows:[row],trends:[{difference:999}]});
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.matchedRows).toHaveLength(0);
    expect(parsed.trends).toBeUndefined();
  });
  it("does not substitute foreign administration or frequencies in correspondence", () => {
    const draft = correspondence(row);
    expect(draft).toContain("Administration POL");
    expect(draft).toContain("801–806 MHz");
    expect(draft).toContain("0 supplied Finnish Excel source rows");
  });
});