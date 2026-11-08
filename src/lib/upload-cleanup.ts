import { detailReadKey, detailReadEvent, readDetailViews } from "./detail-review";
import { guestKeys, guestReviews, guestReviewEvent } from "./oma/guest-storage";
import type { InboxEntry } from "./publication-inbox";

/** Run only after Cloud acknowledges removal. Never wipe unrelated filings. */
export function clearUploadState(
  storage: Pick<Storage, "getItem" | "setItem">,
  entry: InboxEntry,
  ids = entry.publication.filings.map((f) => f.id),
) {
  const views = readDetailViews(storage);
  const reviews = guestReviews(storage);
  for (const id of ids) {
    delete views[`${entry.sha256}:${id}`];
    delete views[`SIM:${entry.publication.issue}:${id}`];
    delete reviews[`SIM:${entry.publication.issue}:${id}`];
  }
  storage.setItem(detailReadKey, JSON.stringify(views));
  storage.setItem(guestKeys.reviews, JSON.stringify(reviews));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(detailReadEvent));
    window.dispatchEvent(new Event(guestReviewEvent));
  }
}
