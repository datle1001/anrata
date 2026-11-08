import { describe, expect, it } from "vitest";
import data from "@/data/ific3074-notice-records.json";
import { buildLetter, pfdOf } from "@/lib/dossier";

const intelsat = data.records.find(r => r.noticeId === "95500027")!;

describe("letter", () => {
  it("leaves the diary number for Traficom to add", () => {
    expect(buildLetter(intelsat)).toContain("Diary number: [to be added by Traficom registry]");
  });
  it("names the IFIC issue and the satellite network", () => {
    const l = buildLetter(intelsat);
    expect(l).toContain("BR IFIC 3074");
    expect(l).toContain("INTELSAT7 66E");
  });
  it("states the calculated exceedance when the PFD limit is exceeded", () => {
    expect(pfdOf(intelsat).status).toBe("exceeds");
    expect(buildLetter(intelsat)).toMatch(/exceeding the limit of -?\d+\.\d dB\(W\/m²\)/);
  });
});
