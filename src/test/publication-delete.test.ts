import { describe, expect, it } from "vitest";
import { removePublication, removeUnscreenedFilings, type InboxEntry } from "@/lib/publication-inbox";

const filing = (id: string, status?: "exceeds" | "not-calculable") => ({
  id, name: id, administration: "S", lowerMHz: 10700, upperMHz: 11700, orbit: "GSO" as const,
  visibility: "v", reviewTrigger: "t", blockers: ["b"],
  ...(status ? { pfdScreening: { status, groups: [] } } : {}),
});
const entry = (sha256: string, filings: ReturnType<typeof filing>[]) =>
  ({ sha256, filename: `${sha256}.json`, raw: "{}", uploadedAt: "2026-11-07T00:00:00Z", transferred: true,
    publication: { schemaVersion: "antara-publication-demo-v1", synthetic: true, issue: 3077, publishedAt: "2026-11-07", filings } }) as unknown as InboxEntry;

describe("deleting uploads", () => {
  it("deletes only the chosen file", () => {
    const out = removePublication([entry("a", [filing("1")]), entry("b", [filing("2")])], "a");
    expect(out.map((e) => e.sha256)).toEqual(["b"]);
  });
  it("removes grey filings and drops files left empty", () => {
    const out = removeUnscreenedFilings([
      entry("a", [filing("1"), filing("2", "not-calculable")]),
      entry("b", [filing("3", "exceeds"), filing("4")]),
    ]);
    expect(out.map((e) => e.sha256)).toEqual(["b"]);
    expect(out[0]!.publication.filings.map((f) => f.id)).toEqual(["3"]);
  });
});
