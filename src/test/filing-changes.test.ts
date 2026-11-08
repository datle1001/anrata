import { describe, expect, it } from "vitest";
import { parseFilingChanges } from "@/lib/filing-changes";
import { uploadedEvidencePage } from "@/lib/upload-evidence";
import { parsePublication, publicationTemplate, type InboxEntry } from "@/lib/publication-inbox";

const stored = { version: 1, status: "changed", matchBasis: "Unique normalized network name and administration",
  scope: "Stored comparison only", baseline: { issue: 3983, filingId: "OLD", sha256: "source-hash" },
  fields: [{ path: "lowerMHz", before: 10700, after: 10700.125, beforePresent: true, afterPresent: true }] };
describe("Stored cross-IFIC differences", () => {
  it("preserves a small numeric change and its exact previous/current values", () => {
    const changes = parseFilingChanges(stored);
    expect(changes?.fields).toEqual([{ path: "lowerMHz", before: 10700, after: 10700.125, beforePresent: true, afterPresent: true }]);
    expect(changes?.baseline?.issue).toBe(3983);
  });
  it("makes the stored difference available to Oma before transfer without mutating the filing", () => {
    const changes = parseFilingChanges(stored);
    if (!changes) throw new Error("Invalid test evidence");
    const filing = { ...publicationTemplate.notices[0], id: "NEW", lowerMHz: 10700.125 };
    const entry: InboxEntry = { publication: parsePublication({ schemaVersion: "antara-publication-demo-v1", synthetic: true,
      issue: 3984, publishedAt: "2026-11-03", filings: [filing] }), raw: "original", filename: "3984.json",
      sha256: "current-hash", uploadedAt: "2026-11-08T00:00:00Z", transferred: false, filingChanges: { NEW: changes } };
    const result = uploadedEvidencePage([entry], [3984], 0);
    expect(result.records[0]?.changes).toEqual(changes);
    expect(result.records[0]?.filing).toEqual(filing);
    expect(result.records[0]?.changes?.baseline?.sha256).toBe("source-hash");
  });
  it("does not invent differences when no stored comparison is available", () => {
    expect(parseFilingChanges(undefined)).toBeUndefined();
    expect(parseFilingChanges({ ...stored, status: "no-baseline", baseline: null, fields: [] })?.fields).toEqual([]);
  });
  it("preserves ambiguous matching rather than reporting a confirmed modification", () => {
    const changes = parseFilingChanges({ ...stored, status: "ambiguous", baseline: null, fields: [] });
    expect(changes?.status).toBe("ambiguous");
    expect(changes?.baseline).toBeNull();
  });
  it("exports original compound values without converting objects into evidence strings", () => {
    const artifact = { ...stored, fields: [{ path: "pfdScreening", before: null, after: { status: "within", groups: [] }, beforePresent: false, afterPresent: true }] };
    const parsed = parseFilingChanges(artifact);
    expect(JSON.parse(parsed?.artifactJson ?? "null")).toEqual(artifact);
  });
});