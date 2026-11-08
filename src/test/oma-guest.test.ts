import { describe, expect, it } from "vitest";
import { guestKeys, guestMessages, guestReviews } from "@/lib/oma/guest-storage";

describe("guest browser workspace", () => {
  it("restores a continuous conversation after refresh without an account", () => {
    localStorage.clear();
    const messages = [
      {
        id: "guest-question",
        role: "user",
        parts: [{ type: "text", text: "Compare DEMO-01 and DEMO-02" }],
      },
    ];
    localStorage.setItem(guestKeys.messages, JSON.stringify(messages));
    expect(guestMessages(localStorage)).toEqual(messages);
  });
  it("restores completed real and synthetic reviews without technical clearance", () => {
    localStorage.setItem(
      guestKeys.reviews,
      JSON.stringify({ "DEMO-01": "completed", "123": "in-review", "456": "safe" }),
    );
    expect(guestReviews(localStorage)).toEqual({ "DEMO-01": "completed", "123": "in-review" });
  });
  it("never reads account history from guest storage", () => {
    localStorage.clear();
    localStorage.setItem(
      "oma:account:messages",
      JSON.stringify([{ id: "private", role: "user", parts: [] }]),
    );
    expect(guestMessages(localStorage)).toEqual([]);
  });
  it("recovers from malformed browser history", () => {
    localStorage.setItem(guestKeys.messages, "invalid-json");
    expect(guestMessages(localStorage)).toEqual([]);
  });
});
