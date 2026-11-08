import { describe, expect, it } from "vitest";
import data from "@/data/ific3074-notice-records.json";
import { buildLetter, pfdOf } from "@/lib/dossier";

const intelsat = data.records.find((r) => r.noticeId === "95500027");
if (!intelsat) throw new Error("Missing INTELSAT reference");

describe("letter", () => {
  it("leaves the diary number for Traficom to add", () => {
    expect(buildLetter(intelsat)).toContain("Diary number: [to be added by Traficom registry]");
  });
  it("names the IFIC issue and the satellite network", () => {
    const l = buildLetter(intelsat);
    expect(l).toContain("BR IFIC 3074");
    expect(l).toContain("INTELSAT7 66E");
  });
  it("retains a positive stored screening margin without changing evidence", () => {
    expect(pfdOf(intelsat).status).toBe("exceeds");
    const group = pfdOf(intelsat).groups[0];
    if (!group) throw new Error("Missing reference group");
    expect(Number.isFinite(group.worstPoint.marginDb)).toBe(true);
    expect(group.worstPoint.marginDb).toBeGreaterThan(0);
  });
});
