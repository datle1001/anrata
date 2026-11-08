import { describe, it, expect } from "vitest";
import {
  terrestrialTemplate,
  terrestrialUploadRows,
  type TerrestrialUploadEntry,
} from "@/lib/terrestrial-upload";
import {
  defaultUploadFilters,
  filterUploadedTerrestrial,
  selectedTerrestrialEvidence,
} from "@/lib/terrestrial-upload-workspace";
import { parseFilingChanges } from "@/lib/filing-changes";

function entry(issue: number, action = "MOD", read = false): TerrestrialUploadEntry {
  const artifact = structuredClone(terrestrialTemplate);
  artifact.issue = issue;
  const row = artifact.records[0];
  if (!row) throw new Error("Missing fixture");
  row.notice.raw.intent = action;
  return {
    id: String(issue),
    artifact,
    sha256: String(issue),
    raw: "original",
    filename: "x.json",
    uploadedAt: "2026-11-08T00:00:00Z",
    transferred: true,
    notices: [
      {
        id: `review-${issue}`,
        noticeId: row.notice.raw.terrakey,
        state: read ? "in-review" : "unreviewed",
        ...(read ? { viewedAt: "2026-11-08" } : {}),
      },
    ],
  };
}
describe("Uploaded terrestrial workspace", () => {
  it("keeps unread notices from the earlier file when a new file arrives", () => {
    const rows = terrestrialUploadRows([entry(3077), entry(3082, "ADD", true)]);
    expect(
      filterUploadedTerrestrial(rows, { ...defaultUploadFilters, workflow: "unread" }).map(
        (r) => r.entry.artifact.issue,
      ),
    ).toEqual([3077]);
  });
  it("breaks simultaneous upload ties by newest IFIC without altering raw actions", () => {
    const rows = terrestrialUploadRows([entry(3077, "SUP"), entry(3082, "MOD")]);
    expect(rows.map((r) => r.entry.artifact.issue)).toEqual([3082, 3077]);
    expect(
      filterUploadedTerrestrial(rows, { ...defaultUploadFilters, action: "SUP" })[0]?.row.notice.raw
        .intent,
    ).toBe("SUP");
  });
  it("does not clear no-overlap records or mix synthetic and supplied evidence", () => {
    const real = entry(3081);
    real.artifact.synthetic = false;
    const rows = terrestrialUploadRows([real, entry(3082)]);
    expect(
      filterUploadedTerrestrial(rows, {
        ...defaultUploadFilters,
        source: "supplied",
        relevance: "no-overlap",
      }).map((r) => r.entry.artifact.issue),
    ).toEqual([3081]);
  });
  it("exports only explicitly selected rows and unchanged stored comparison values", () => {
    const current = entry(3082);
    const artifact = {
      version: 1,
      status: "changed",
      matchBasis: "terrakey",
      scope: "supplied evidence",
      baseline: { issue: 3081, filingId: "SIM-T-001", sha256: "old" },
      fields: [
        {
          path: "arbitrary.nested",
          before: [null, 0.002],
          after: [true, 0.003],
          beforePresent: true,
          afterPresent: true,
        },
      ],
    };
    const notice = current.notices[0];
    if (!notice) throw new Error("fixture");
    notice.changes = parseFilingChanges(artifact);
    const rows = terrestrialUploadRows([entry(3077), current]);
    const exported = selectedTerrestrialEvidence(rows, [notice.id]);
    expect(exported).toHaveLength(1);
    expect(exported[0]?.changes).toEqual(artifact);
    expect(exported[0]?.record).toEqual(current.artifact.records[0]);
    expect(
      filterUploadedTerrestrial(rows, { ...defaultUploadFilters, comparison: "changed" }).map(
        (r) => r.entry.artifact.issue,
      ),
    ).toEqual([3082]);
  });
});
