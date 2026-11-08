import type { UIMessage } from "ai";

export const guestReviewEvent = "antara:guest-reviews-change";

export const guestKeys = {
  messages: "antara:guest:oma:messages:v1",
  reviews: "antara:guest:reviews:v1",
  audit: "antara:guest:audit:v1",
} as const;

export function readGuest<T>(storage: Pick<Storage, "getItem">, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function guestMessages(storage: Pick<Storage, "getItem">): UIMessage[] {
  const value = readGuest<unknown>(storage, guestKeys.messages, []);
  return Array.isArray(value)
    ? value.filter(
        (m) =>
          m &&
          typeof m.id === "string" &&
          ["user", "assistant"].includes(m.role) &&
          Array.isArray(m.parts),
      )
    : [];
}

export function guestReviews(storage: Pick<Storage, "getItem">): Record<string, string> {
  const value = readGuest<unknown>(storage, guestKeys.reviews, {});
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, state]) =>
        typeof state === "string" && ["unreviewed", "in-review", "completed"].includes(state),
    ),
  );
}

export function recordGuestAction(action: string, evidence: unknown) {
  const existing = readGuest<unknown>(localStorage, guestKeys.audit, []);
  const rows = Array.isArray(existing) ? existing : [];
  localStorage.setItem(
    guestKeys.audit,
    JSON.stringify([
      ...rows,
      { action, evidence, at: new Date().toISOString(), scope: "browser-demo" },
    ]),
  );
}
