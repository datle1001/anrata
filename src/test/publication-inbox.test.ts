import { describe, expect, it } from "vitest";
import {
  addPublication,
  parsePublication,
  publicationTemplate,
  readInbox,
  inboxKey,
  sameFilingEvidence,
  type InboxEntry,
} from "@/lib/publication-inbox";
import { recentContext, matchesAdministration } from "@/lib/oma/context";
import { validateCommand } from "@/lib/oma/workspace";
import type { UIMessage } from "ai";

const entry: InboxEntry = {
  publication: parsePublication(publicationTemplate),
  raw: JSON.stringify(publicationTemplate),
  filename: "demo.json",
  sha256: "abc",
  uploadedAt: "2026-11-07",
  transferred: false,
};
describe("Publication and conversational boundaries", () => {
  it("permits Cloud key reordering on scan but rejects modified values or array ordering", () => {
    expect(sameFilingEvidence({ extra: { z: 1, a: 2 }, id: "A" }, { id: "A", extra: { a: 2, z: 1 } })).toBe(true);
    expect(sameFilingEvidence({ extra: { a: 2 } }, { extra: { a: 2.001 } })).toBe(false);
    expect(sameFilingEvidence({ extra: [1, 2] }, { extra: [2, 1] })).toBe(false);
    expect(sameFilingEvidence({ extra: null }, {})).toBe(false);
  });
  it("preserves arbitrary filing data and nested additions/removals for comprehensive comparison", () => {
    const notices = publicationTemplate.notices.map((f) => ({ ...f,
      coordination: { polarization: "RHCP", antennas: [{ serial: "A1", tilt: 0.001 }], nullable: null },
      affectedStations: [{ name: "FI-TEST", metadata: { active: true } }],
    }));
    const parsed = parsePublication({ ...publicationTemplate, notices });
    expect(parsed.filings).toEqual(notices);
    const revised = { ...notices[0], coordination: { polarization: "LHCP", antennas: [{ serial: "A1", tilt: 0.002 }], added: "new value" } };
    const next = parsePublication({ ...publicationTemplate, publication: { ...publicationTemplate.publication, ific_no: 3082, total_notices: 1 }, notices: [revised] });
    expect(next.filings[0]).toEqual(revised);
  });
  it("preserves extra evidence inside stored PFD groups, inputs and sample points without recomputing", () => {
    const pfdScreening = { status: "within", groups: [{ groupId: "g", freqLowMHz: 10700, freqHighMHz: 11700,
      citation: "Supplied demo", referenceBandwidthHz: 4000, antenna: { polarization: "RHCP" },
      inputs: { psdMaxDbwHz: -60, gainMaxDbi: 0, calibration: { note: "original" } },
      worstPoint: { label: "FI", lat: 60, lon: 25, arrivalAngleDeg: 10, slantRangeKm: 38000, spreadingLossDb: 160,
        pfdDb: -150, limitDb: -145, marginDb: -5, source: { revision: 2 } },
    }], additionalAudit: { checked: false } };
    const parsed = parsePublication({ ...publicationTemplate, notices: publicationTemplate.notices.map((f) => ({ ...f, pfdScreening })) });
    expect(parsed.filings[0]?.pfdScreening).toEqual(pfdScreening);
  });
  it("does not let extra evidence bypass validation of known filing fields", () => {
    expect(() => parsePublication({ ...publicationTemplate, notices: [{ ...publicationTemplate.notices[0], lowerMHz: "wrong", extra: { valid: true } }] })).toThrow();
  });
  it("preserves unresolved synthetic rows without manufacturing PFD", () => {
    const p = parsePublication(publicationTemplate);
    expect(p.synthetic).toBe(true);
    expect(p.filings).toHaveLength(2);
    const first = p.filings[0];
    if (!first) throw new Error("Missing template filing");
    expect("pfd" in first).toBe(false);
  });
  it("rejects uploads pretending to be genuine ITU evidence", () => {
    expect(() => parsePublication({ ...publicationTemplate, synthetic: false })).toThrow();
  });
  it("rejects descending frequencies", () => {
    expect(() =>
      parsePublication({
        ...publicationTemplate,
        notices: [{ ...publicationTemplate.notices[0], lowerMHz: 12000, upperMHz: 11000 }],
      }),
    ).toThrow();
  });
  it("accepts publication/notices metadata and preserves supplied rows", () => {
    const { publication, notices } = publicationTemplate;
    const parsed = parsePublication({ publication, notices });
    expect(parsed.issue).toBe(3077);
    expect(parsed.publishedAt).toBe("2026-11-07");
    expect(parsed.filings).toEqual(notices);
    expect(parsed.synthetic).toBe(true);
  });
  it("keeps the versioned flat format compatible", () => {
    const legacy = entry.publication;
    expect(parsePublication(legacy)).toEqual(legacy);
  });
  it("rejects a declared total that differs from the supplied notices", () => {
    expect(() => parsePublication({
      ...publicationTemplate,
      publication: { ...publicationTemplate.publication, total_notices: 5 },
    })).toThrow("total_notices must match");
  });
  it("rejects terrestrial metadata rather than transferring into the Space queue", () => {
    expect(() => parsePublication({
      ...publicationTemplate,
      publication: { ...publicationTemplate.publication, service: "Terrestrial Services" },
    })).toThrow();
  });
  it("rejects repeated notice IDs in the new envelope", () => {
    expect(() => parsePublication({
      ...publicationTemplate,
      notices: [publicationTemplate.notices[0], publicationTemplate.notices[0]],
    })).toThrow("Duplicate filing IDs");
  });
  it("deduplicates repeated releases", () => {
    expect(() => addPublication([entry], entry)).toThrow();
    expect(() => addPublication([entry], { ...entry, sha256: "different" })).toThrow();
  });
  it("restores uploads and transfer state unchanged after refresh", () => {
    localStorage.setItem(inboxKey, JSON.stringify([{ ...entry, transferred: true }]));
    expect(readInbox(localStorage)[0]?.raw).toBe(entry.raw);
    expect(readInbox(localStorage)[0]?.transferred).toBe(true);
  });
  it("uses at most six recent messages without truncating original history or embedded tool pairs", () => {
    const messages: UIMessage[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      role: i % 2 ? "assistant" : "user",
      parts: [{ type: "text", text: String(i) }],
    }));
    expect(recentContext(messages).map((m) => m.id)).toEqual(["4", "5", "6", "7", "8", "9"]);
    expect(messages).toHaveLength(10);
    const toolMessage: UIMessage = {
      id: "tool",
      role: "assistant",
      parts: [
        {
          type: "dynamic-tool",
          toolName: "search",
          toolCallId: "pair",
          state: "output-available",
          input: {},
          output: { total: 15 },
        },
      ],
    };
    expect(recentContext([messages[0] as UIMessage, toolMessage])[1]).toEqual(toolMessage);
  });
  it("matches D exactly across record types, not incidental text", () => {
    expect(matchesAdministration(" D ", "d")).toBe(true);
    expect(matchesAdministration("DNK", "D")).toBe(false);
    expect(matchesAdministration("NOR", null)).toBe(true);
  });
  it("maps unread to unreviewed without changing evidence", () => {
    expect(
      validateCommand({
        publication: null,
        status: null,
        query: null,
        workflow: "unread",
        sort: null,
        filingId: null,
        demo: null,
      }).workflow,
    ).toBe("unreviewed");
  });
});
