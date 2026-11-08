import { describe, expect, it } from "vitest";
import summary from "@/data/terrestrial3076-screening-summary.json";
import { terrestrialArtifactSchema } from "@/lib/terrestrial-review";
import { terrestrialExpertChecks } from "@/lib/terrestrial-expert-checks";

const [row] = terrestrialArtifactSchema.parse({
  issue: 3076,
  scope: summary.scope,
  records: [summary.example],
}).records;
if (!row) throw new Error("Missing reference evidence");
describe("Expert protection checks preserve unresolved evidence", () => {
  it("detects reported RR 6.7 without confirming a register agreement", () => {
    const result = terrestrialExpertChecks({
      ...row,
      notice: { ...row.notice, raw: { ...row.notice.raw, prov: "RR 6.7" } },
    });
    expect(result.register.cites67).toBe(true);
    expect(result.register.status).toBe("unverified");
  });
  it("does not match RR 6.70 as RR 6.7", () => {
    expect(
      terrestrialExpertChecks({
        ...row,
        notice: { ...row.notice, raw: { ...row.notice.raw, prov: "6.70" } },
      }).register.cites67,
    ).toBe(false);
  });
  it("keeps M4 unassessed when there are no Excel matches", () => {
    const result = terrestrialExpertChecks({ ...row, matchedFinnishRows: [] });
    expect(result.licenceExempt.noExcelMatch).toBe(true);
    expect(result.licenceExempt.status).toBe("unassessed");
  });
  it("does not select a universal 12 dB threshold or invent field strength for 801–806 MHz", () => {
    const result = terrestrialExpertChecks({
      ...row,
      notice: { ...row.notice, raw: { ...row.notice.raw, freq_min: "801", freq_max: "806" } },
    });
    expect(result.coordination.selectedThresholdDbUvPerM).toBeNull();
    expect(result.coordination.fieldStrengthDbUvPerM).toBeNull();
    expect(result.coordination.status).toBe("unconfirmed");
  });
});
