import { describe, it, expect } from "vitest";
import { clearUploadState } from "@/lib/upload-cleanup";
import { detailReadKey } from "@/lib/detail-review";
import { guestKeys } from "@/lib/oma/guest-storage";
import { parsePublication, publicationTemplate } from "@/lib/publication-inbox";
import {
  terrestrialUploadSchema,
  terrestrialTemplate,
  terrestrialUploadRows,
} from "@/lib/terrestrial-upload";
import { terrestrialLetter } from "@/lib/terrestrial-review";

describe("Publication lifecycle", () => {
  it("deletion resets only selected upload read and review state for fresh re-upload", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
    };
    storage.setItem(
      detailReadKey,
      JSON.stringify({ "hash:SIM-3077-001": "read", "other:notice": "read" }),
    );
    storage.setItem(
      guestKeys.reviews,
      JSON.stringify({ "SIM:3077:SIM-3077-001": "completed", "SIM:3082:other": "completed" }),
    );
    clearUploadState(storage, {
      publication: parsePublication(publicationTemplate),
      sha256: "hash",
      raw: "{}",
      filename: "x",
      uploadedAt: "now",
      transferred: true,
    });
    expect(JSON.parse(storage.getItem(detailReadKey) ?? "{}")).toEqual({ "other:notice": "read" });
    expect(JSON.parse(storage.getItem(guestKeys.reviews) ?? "{}")).toEqual({
      "SIM:3082:other": "completed",
    });
  });
  it("terrestrial accepts arbitrary nested data without changing source values", () => {
    const input = structuredClone(terrestrialTemplate);
    const row = input.records[0];
    if (!row) throw new Error("fixture");
    const raw = { ...row.notice.raw, extra: { polarization: "LHCP", flags: [null, 0.002, true] } };
    const result = terrestrialUploadSchema.parse({
      ...input,
      records: [{ ...row, notice: { ...row.notice, raw } }],
    });
    expect(result.records[0]?.notice.raw).toEqual(raw);
  });
  it("terrestrial rejects wrong service and mismatched declared count", () => {
    expect(
      terrestrialUploadSchema.safeParse({ ...terrestrialTemplate, service: "Space Services" })
        .success,
    ).toBe(false);
    expect(
      terrestrialUploadSchema.safeParse({ ...terrestrialTemplate, totalNotices: 2 }).success,
    ).toBe(false);
  });
  it("terrestrial rejects duplicate identities and non land-mobile classes", () => {
    const row = terrestrialTemplate.records[0];
    if (!row) throw new Error("fixture");
    expect(
      terrestrialUploadSchema.safeParse({
        ...terrestrialTemplate,
        totalNotices: 2,
        records: [row, row],
      }).success,
    ).toBe(false);
    expect(
      terrestrialUploadSchema.safeParse({
        ...terrestrialTemplate,
        records: [{ ...row, notice: { ...row.notice, raw: { ...row.notice.raw, stn_cls: "BC" } } }],
      }).success,
    ).toBe(false);
  });
  it("terrestrial scan gates desk visibility and newest uploads stay first", () => {
    const base = {
      id: "a",
      artifact: terrestrialTemplate,
      raw: "{}",
      sha256: "a",
      filename: "a",
      uploadedAt: "2026-11-08T00:00:00Z",
      transferred: false,
      notices: [],
    };
    expect(terrestrialUploadRows([base])).toEqual([]);
    expect(
      terrestrialUploadRows([
        { ...base, transferred: true },
        { ...base, id: "b", transferred: true, uploadedAt: "2026-11-08T01:00:00Z" },
      ]).map((r) => r.entry.id),
    ).toEqual(["b", "a"]);
  });
  it("terrestrial correspondence uses selected publication, not hardcoded benchmark issue", () => {
    const row = terrestrialTemplate.records[0];
    if (!row) throw new Error("fixture");
    const letter = terrestrialLetter(row, new Date("2026-11-08"), 3082, true);
    expect(letter).toContain("BR IFIC 3082");
    expect(letter).not.toContain("BR IFIC 3076");
    expect(letter).toContain("Synthetic demonstration");
  });
});
