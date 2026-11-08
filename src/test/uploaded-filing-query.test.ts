import { describe, expect, it } from "vitest";
import { validateUploadedFilter, type UploadedFilingFilter } from "@/lib/uploaded-filing-query";
import { parsePublication, publicationTemplate, type InboxEntry } from "@/lib/publication-inbox";
import { uploadedFilingEvidence } from "@/lib/upload-evidence";

const filter: UploadedFilingFilter = { issues: [3081, 3077], administration: null, filingId: null,
  status: null, lowerMHz: null, upperMHz: null, offset: 0 };
describe("Immediate uploaded filing evidence", () => {
  it("accepts cross-issue filters before transfer", () => {
    expect(validateUploadedFilter(filter).issues).toEqual([3081, 3077]);
  });
  it("rejects invalid frequency ranges instead of silently widening them", () => {
    expect(() => validateUploadedFilter({ ...filter, lowerMHz: 4200, upperMHz: 3400 })).toThrow();
  });
  it("rejects unknown PFD categories", () => {
    expect(() => validateUploadedFilter({ ...filter, status: "safe" })).toThrow();
  });
  it("keeps supplied PFD and source evidence unchanged for an untransferred upload", () => {
    const publication = parsePublication(publicationTemplate);
    const filing = publication.filings[0];
    if (!filing) throw new Error("Test fixture requires a filing.");
    filing.pfdScreening = { status: "exceeds", worstMarginDb: 4.25, groups: [] };
    const entry: InboxEntry = { publication, raw: "original", filename: "3081.json", sha256: "source-hash",
      uploadedAt: "2026-11-08T01:23:00Z", transferred: false };
    const evidence = uploadedFilingEvidence(entry, filing);
    expect(evidence.pfdCalculation).toEqual({ status: "exceeds", worstMarginDb: 4.25, groups: [] });
    expect(evidence.reviewTrigger).toBe(filing.reviewTrigger);
    expect(evidence.provenance.sha256).toBe("source-hash");
  });
});