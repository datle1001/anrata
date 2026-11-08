import { describe, it, expect } from "vitest";
import { overlap, validateCommand, type WorkspaceCommand } from "@/lib/oma/workspace";
import demos from "@/data/demo-filings.json";
import notices from "@/data/ific3074-notice-records.json";
const empty: WorkspaceCommand = {
  publication: null,
  status: null,
  query: null,
  workflow: null,
  sort: null,
  filingId: null,
  demo: null,
};
describe("Oma expert boundaries", () => {
  it("red filtering maps to stored exceeds without completing a review", () => {
    expect(validateCommand({ ...empty, status: "exceeds" })).toEqual({
      ...empty,
      status: "exceeds",
    });
  });
  it("does not accept safe as a technical workflow outcome", () => {
    expect(() => validateCommand({ ...empty, workflow: "safe" })).toThrow();
  });
  it("does not allow arbitrary navigation destinations", () => {
    expect(() =>
      validateCommand({ ...empty, publication: "https://example.com" as "space" }),
    ).toThrow();
  });
  it("preserves real dataset identities and isolates every synthetic scenario", () => {
    expect(notices.records.length).toBe(131);
    expect(demos.records.length).toBe(8);
    for (const r of demos.records) {
      expect(r.id.startsWith("DEMO-")).toBe(true);
      expect(notices.records.some((n) => n.noticeId === r.id)).toBe(false);
    }
  });
  it("counts interval overlap only, with no invented adjacent-band buffer", () => {
    expect(overlap(3400, 4200, 4199, 4300)).toBe(true);
    expect(overlap(3400, 4200, 4200, 4300)).toBe(false);
    expect(overlap(3400, 4200, 4300, 4400)).toBe(false);
  });
});
