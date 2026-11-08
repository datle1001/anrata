import { describe, expect, it } from "vitest";
import { p1546AssessmentSchema } from "@/lib/p1546-assessment";
import { rowSchema, terrestrialLetter } from "@/lib/terrestrial-review";
import { terrestrialTemplate, terrestrialUploadSchema } from "@/lib/terrestrial-upload";
import { selectedTerrestrialEvidence } from "@/lib/terrestrial-upload-workspace";
import reference from "@/data/p1546-notice-reference.json";

const row = terrestrialTemplate.records[0];
if (!row) throw new Error("Missing template record");
const hash = "a".repeat(64);
const artifact = {
  schemaVersion: "antara-p1546-v1",
  noticeId: row.notice.raw.terrakey,
  scope: "Conditional test sample, not actual-path validation",
  sourceRecord: row,
  provenance: {
    sourceSha256: hash,
    manifestSha256: hash,
    scriptSha256: hash,
    modelTreeSha256: hash,
    modelCommit: "pinned",
    modelRepository: "https://github.com/eeveetza/p1546",
    validationScope: "Not independently validated",
  },
  limitations: ["No safety finding"],
  paths: [
    {
      id: "sample",
      target: "Test point",
      status: "conditional",
      distanceKm: 100,
      fieldStrengthDbUvPerM: 15,
      basicTransmissionLossDb: 130,
      inputs: { erpKw: 0.1 },
      assumptions: ["Conditional ERP"],
      blockers: [],
      comparison: {
        status: "conditional-above-trigger",
        thresholdDbUvPerM: 12,
        marginDb: 3,
        source: "T/R 25-08 A1.2.3",
        reason: "Conditional only",
      },
    },
  ],
};
describe("Immutable notice-linked P.1546", () => {
  it("keeps executed reference values and out-of-domain paths separate from comparisons", () => {
    const stored = p1546AssessmentSchema.parse(reference);
    expect(stored.paths.find((p) => p.id === "987279-Land")?.fieldStrengthDbUvPerM).toBe(
      -57.407288886711,
    );
    expect(stored.paths.find((p) => p.id === "987279-Cold")?.fieldStrengthDbUvPerM).toBe(
      -35.658872975466,
    );
    expect(stored.paths.find((p) => p.id === "983905-Land")?.fieldStrengthDbUvPerM).toBeNull();
    expect(stored.paths.every((p) => p.comparison.marginDb === null)).toBe(true);
  });
  it("accepts existing JSON without requiring a calculation", () => {
    expect(terrestrialUploadSchema.parse(terrestrialTemplate).records[0]?.p1546).toBeUndefined();
  });
  it("preserves the complete artifact through upload parsing and selected exports", () => {
    const publication = terrestrialUploadSchema.parse({
      ...terrestrialTemplate,
      records: [{ ...row, p1546: artifact }],
    });
    expect(publication.records[0]?.p1546).toEqual(artifact);
    const evidence = selectedTerrestrialEvidence(
      [
        {
          entry: {
            id: "entry",
            artifact: publication,
            sha256: hash,
            raw: "original",
            filename: "test.json",
            uploadedAt: "2026-11-08",
            transferred: true,
            notices: [],
          },
          row: publication.records[0] ?? row,
          review: { id: "review", noticeId: row.notice.raw.terrakey, state: "unreviewed" },
        },
      ],
      ["review"],
    );
    expect(evidence[0]?.record.p1546).toEqual(artifact);
  });
  it("rejects stale calculations after arbitrary source data changes", () => {
    expect(
      rowSchema.safeParse({
        ...row,
        notice: { ...row.notice, raw: { ...row.notice.raw, custom: { gain: 9 } } },
        p1546: artifact,
      }).success,
    ).toBe(false);
  });
  it("rejects a calculation linked to another notice", () => {
    expect(
      rowSchema.safeParse({ ...row, p1546: { ...artifact, noticeId: "another" } }).success,
    ).toBe(false);
  });
  it("rejects unresolved paths containing a prediction", () => {
    expect(
      p1546AssessmentSchema.safeParse({
        ...artifact,
        paths: [{ ...artifact.paths[0], status: "unresolved" }],
      }).success,
    ).toBe(false);
  });
  it("rejects a margin inconsistent with the stored field and threshold", () => {
    expect(
      p1546AssessmentSchema.safeParse({
        ...artifact,
        paths: [
          { ...artifact.paths[0], comparison: { ...artifact.paths[0]?.comparison, marginDb: 9 } },
        ],
      }).success,
    ).toBe(false);
  });
  it("adds only stored conditional values to the selected letter", () => {
    const prepared = rowSchema.parse({ ...row, p1546: artifact });
    expect(terrestrialLetter(prepared)).toContain("15 dBµV/m (conditional)");
    expect(terrestrialLetter(row)).not.toContain("15 dBµV/m");
  });
});
