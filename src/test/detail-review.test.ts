import { describe, expect, it } from "vitest";
import { detailReviewState, isUnreadFiling, readDetailViews } from "@/lib/detail-review";

describe("Detail-open workflow", () => {
  it("starts review when an unreviewed detail is opened in any queue", () => {
    expect(detailReviewState("unreviewed")).toBe("in-review");
  });
  it("never reopens a completed review on viewing", () => {
    expect(detailReviewState("completed")).toBe("completed");
  });
  it("keeps already ongoing reviews ongoing", () => {
    expect(detailReviewState("in-review")).toBe("in-review");
  });
  it("never marks a previously viewed filing unread after resetting workflow", () => {
    const at = "2026-11-07T23:43:00Z";
    const saved = readDetailViews({ getItem: () => JSON.stringify({ filing: at }) });
    expect(isUnreadFiling("unreviewed", saved["filing"])).toBe(false);
    expect(isUnreadFiling("unreviewed")).toBe(true);
    expect(isUnreadFiling("in-review")).toBe(false);
  });
});
