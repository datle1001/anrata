import { describe, expect, it } from "vitest";
import {
  addPublication,
  parsePublication,
  publicationTemplate,
  readInbox,
  inboxKey,
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
