/** Viewing is workflow only; it cannot reopen a completed review or change evidence. */
export function detailReviewState(state: string) {
  return state === "unreviewed" ? "in-review" : state;
}

export function isUnreadFiling(state: string, viewedAt?: string) {
  return state === "unreviewed" && !viewedAt;
}

export const detailReadKey = "antara:filing-details-read:v1";
export const detailReadEvent = "antara:filing-details-read-change";

export function readDetailViews(storage: Pick<Storage, "getItem">): Record<string, string> {
  try {
    const value: unknown = JSON.parse(storage.getItem(detailReadKey) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, at]) => typeof at === "string"));
  } catch {
    return {};
  }
}
