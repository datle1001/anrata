import { describe, expect, it } from "vitest";
import { deskPage, matchesSpaceWorkflow, transferredSpaceRows } from "@/lib/space-desk";
import { parsePublication, publicationTemplate } from "@/lib/publication-inbox";
import { detailReviewState, isUnreadFiling } from "@/lib/detail-review";

describe("Space multi-publication desk", () => {
  it("keeps all four unopened IFIC 3077 filings unread after IFIC 3081 arrives", () => {
    const publication = parsePublication(publicationTemplate);
    const filing = publication.filings[0];
    if (!filing) throw new Error("Template must include a filing");
    const filings = Array.from({ length: 4 }, (_, i) => ({
      ...filing,
      id: `SIM-3077-${i + 1}`,
    }));
    const first = {
      publication: { ...publication, filings },
      raw: "original 3077",
      filename: "3077.json",
      sha256: "hash3077",
      uploadedAt: "2026-11-08T01:00:00Z",
      transferred: true,
    };
    const second = {
      ...first,
      publication: { ...publication, issue: 3081 },
      filename: "3081.json",
      sha256: "hash3081",
      uploadedAt: "2026-11-08T01:10:00Z",
    };
    const unread3077 = (entries: Parameters<typeof transferredSpaceRows>[0]) =>
      transferredSpaceRows(entries)
        .filter((row) => row.issue === "3077")
        .filter(() => isUnreadFiling("unreviewed"));
    expect(unread3077([first])).toHaveLength(4);
    expect(latestScan(transferredSpaceRows([first, second]))?.filenames).toEqual(["3081.json"]);
    expect(unread3077([first, second])).toHaveLength(4);
    const rows = transferredSpaceRows([first, second]);
    const viewedId = "SIM:3077:SIM-3077-1";
    expect(rows.filter((row) => row.issue === "3077" && isUnreadFiling(
      row.id === viewedId ? detailReviewState("unreviewed") : "unreviewed",
      row.id === viewedId ? "2026-11-08T01:15:00Z" : undefined,
    ))).toHaveLength(3);
  });
  it("retains synthetic identities and unresolved status, transferring only selected publications", () => {
    const entry = {
      publication: parsePublication(publicationTemplate),
      raw: "original",
      filename: "release.json",
      sha256: "hash",
      uploadedAt: "2026-11-07",
      transferred: true,
    };
    const rows = transferredSpaceRows([entry, { ...entry, transferred: false }]);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe("SIM:3077:SIM-3077-001");
    expect(rows[0]?.status).toBe("not-calculable");
    expect(rows[0]?.entry.raw).toBe("original");
  });
  it("keeps reviewed records out of outstanding without deleting them", () => {
    expect(matchesSpaceWorkflow("completed", "outstanding")).toBe(false);
    expect(matchesSpaceWorkflow("in-review", "outstanding")).toBe(true);
    expect(matchesSpaceWorkflow("completed", "completed")).toBe(true);
  });
  it("bounds the displayed list to 25 rows even with tens of thousands of records", () => {
    const rows = Array.from({ length: 10000 }, (_, i) => i);
    expect(deskPage(rows, 1).rows).toEqual(rows.slice(25, 50));
    expect(deskPage(rows, 999).current).toBe(399);
    expect(deskPage(rows, 999).rows).toHaveLength(25);
  });
});

import { latestScan, relativeAge } from "@/lib/space-desk";
describe("latest scan marker", () => {
  it("ages from 1 min to 10 min", () => {
    const t = Date.parse("2026-11-07T21:00:00Z");
    expect(relativeAge("2026-11-07T21:00:00Z", t + 10_000)).toBe("just now");
    expect(relativeAge("2026-11-07T21:00:00Z", t + 60_000)).toBe("1 min ago");
    expect(relativeAge("2026-11-07T21:00:00Z", t + 600_000)).toBe("10 min ago");
  });
  it("picks only the newest transferred batch, newest first", () => {
    const base = { publication: parsePublication(publicationTemplate), raw: "r", sha256: "h", uploadedAt: "2026-11-01", transferred: true };
    const rows = transferredSpaceRows([
      { ...base, filename: "old.json", transferredAt: "2026-11-07T20:00:00Z" },
      { ...base, filename: "new.json", transferredAt: "2026-11-07T21:00:00Z" },
    ]);
    expect(rows[0]?.entry.filename).toBe("new.json");
    expect(latestScan(rows)?.filenames).toEqual(["new.json"]);
  });
});
