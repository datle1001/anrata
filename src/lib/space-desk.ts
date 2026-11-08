import type { InboxEntry } from "@/lib/publication-inbox";

const filingStatusOrder = {
  exceeds: 0,
  "near-limit": 1,
  within: 2,
  "not-calculable": 3,
};

export function transferredSpaceRows(entries: InboxEntry[]) {
  return entries
    .filter((entry) => entry.transferred)
    .sort((a, b) =>
      Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt) ||
      b.publication.issue - a.publication.issue ||
      Date.parse(b.transferredAt ?? b.uploadedAt) - Date.parse(a.transferredAt ?? a.uploadedAt) ||
      a.sha256.localeCompare(b.sha256),
    )
    .flatMap((entry) =>
      [...entry.publication.filings]
        .sort((a, b) =>
          filingStatusOrder[a.pfdScreening?.status ?? "not-calculable"] -
          filingStatusOrder[b.pfdScreening?.status ?? "not-calculable"],
        )
        .map((filing) => ({
        entry,
        filing,
        id: `SIM:${entry.publication.issue}:${filing.id}`,
        issue: String(entry.publication.issue),
        scannedAt: entry.transferredAt ?? entry.uploadedAt,
        status: filing.pfdScreening?.status ?? ("not-calculable" as const),
      })),
    );
}

/** Most recent scan batch (one transfer = one batch); null when nothing transferred. */
export function latestScan(rows: { scannedAt: string; entry: { filename: string } }[]) {
  const first = rows[0];
  if (!first) return null;
  const at = rows.reduce(
    (m, r) => (Date.parse(r.scannedAt) > Date.parse(m) ? r.scannedAt : m),
    first.scannedAt,
  );
  const batch = rows.filter((r) => r.scannedAt === at);
  return { at, count: batch.length, filenames: [...new Set(batch.map((r) => r.entry.filename))] };
}

export function relativeAge(iso: string, now: number) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "at unknown time";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function matchesSpaceWorkflow(state: string, workflow: string) {
  return (
    workflow === "all" || (workflow === "outstanding" ? state !== "completed" : state === workflow)
  );
}

export function deskPage<T>(rows: T[], page: number) {
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const current = Math.min(Math.max(0, page), pages - 1);
  return { current, pages, rows: rows.slice(current * 25, current * 25 + 25) };
}
