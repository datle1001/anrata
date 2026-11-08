import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { currentQuestion, recentContext } from "@/lib/oma/context";

const message = (id: string, role: UIMessage["role"], text: string): UIMessage => ({
  id, role, parts: [{ type: "text", text }],
});

describe("Oma current-question scope", () => {
  it("keeps the standalone above-limit question separate from the Russia lookup", () => {
    const history = [
      message("1", "user", "tell me how many filing that are russia"),
      message("2", "assistant", "117 Russian filings/notices"),
      message("3", "user", "what are the main issues that make filing above sotred limit"),
    ];
    expect(currentQuestion(history)).toBe("what are the main issues that make filing above sotred limit");
    expect(recentContext(history)).toHaveLength(3);
  });

  it("preserves explicit follow-up wording and its reference history", () => {
    const history = [
      message("1", "user", "tell me how many filing that are russia"),
      message("2", "assistant", "117 Russian filings/notices"),
      message("3", "user", "which of those Russian filings are above the stored limit"),
    ];
    expect(currentQuestion(history)).toBe("which of those Russian filings are above the stored limit");
    expect(recentContext(history)[0]?.id).toBe("1");
  });

  it("does not mistake assistant output for the user's current question", () => {
    expect(currentQuestion([
      message("1", "user", "what are the main issues"),
      message("2", "assistant", "response"),
    ])).toBe("what are the main issues");
    expect(currentQuestion([])).toBe("");
  });
});