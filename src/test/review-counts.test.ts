import { describe, expect, it } from "vitest";
import { outstandingCounts } from "@/lib/review-counts";

const rows = [
  { id: "a", status: "exceeds" },
  { id: "b", status: "near-limit" },
  { id: "c", status: "within" },
  { id: "d", status: "not-calculable" },
];
describe("Outstanding review workload", () => {
  it("removes completed filings but retains unread and in-review filings", () => {
    expect(outstandingCounts(rows, { a: "completed", b: "in-review" })).toEqual({
      exceeds: 0, "near-limit": 1, within: 1, "not-calculable": 1,
    });
  });
  it("shows zero in every category after all reviews are completed", () => {
    expect(outstandingCounts(rows, Object.fromEntries(rows.map(r => [r.id, "completed"])))).toEqual({
      exceeds: 0, "near-limit": 0, within: 0, "not-calculable": 0,
    });
  });
  it("adds transferred unresolved filings without manufacturing an exceedance", () => {
    const completed = Object.fromEntries(rows.map(r => [r.id, "completed"]));
    expect(outstandingCounts([...rows, { id: "SIM:3077:new", status: "not-calculable" }], completed)).toEqual({
      exceeds: 0, "near-limit": 0, within: 0, "not-calculable": 1,
    });
  });
  it("restores the count when a completed filing is reopened", () => {
    expect(outstandingCounts(rows, { a: "unreviewed" })["exceeds"]).toBe(1);
  });
});