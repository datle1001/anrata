import { describe, expect, it } from "vitest";
import { parsePublication, publicationTemplate, type InboxEntry } from "@/lib/publication-inbox";
import { uploadedEvidencePage } from "@/lib/upload-evidence";

const makeEntry = (issue: number, count = 2): InboxEntry => ({
  publication: parsePublication({ schemaVersion: "antara-publication-demo-v1", synthetic: true,
    issue, publishedAt: "2026-11-07", filings: Array.from({length: count}, (_, i) => ({...publicationTemplate.notices[0], id: `${issue}-${i}`, blockers: []})) }),
  filename: `${issue}.json`, raw: "original", sha256: String(issue), uploadedAt: "2026-11-08T01:07:00Z", transferred: false,
});
describe("Cloud upload evidence", () => {
  it("makes 3081 and 3077 evidence available before desk transfer", () => {
    const page = uploadedEvidencePage([makeEntry(3081), makeEntry(3077)], [3081, 3077], 0);
    expect(page.total).toBe(4);
    expect(page.missingIssues).toEqual([]);
    expect(page.records.map((r) => r.issue)).toEqual([3081, 3081, 3077, 3077]);
  });
  it("retains missing PFD instead of inventing a calculation", () => {
    const page = uploadedEvidencePage([makeEntry(3081)], [3081], 0);
    expect(page.records[0]?.pfdCalculation).toBeNull();
    expect(page.records[0]?.reviewTrigger).toBe(publicationTemplate.notices[0]?.reviewTrigger);
    expect(page.records[0]?.provenance.sha256).toBe("3081");
  });
  it("aggregates all rows before paging and reports missing issues", () => {
    const page = uploadedEvidencePage([makeEntry(3081, 12)], [3081, 3077], 5);
    expect(page.total).toBe(12);
    expect(page.records).toHaveLength(5);
    expect(page.nextOffset).toBe(10);
    expect(page.missingIssues).toEqual([3077]);
  });
});