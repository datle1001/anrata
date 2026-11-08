import type { InboxEntry } from "./publication-inbox";
import { pfdMeta, type Station } from "./dossier";

export function uploadedFilingEvidence(entry: InboxEntry, filing: InboxEntry["publication"]["filings"][number]) {
  const stations = Object.entries(pfdMeta.finnishStations as unknown as Record<string, Station>)
    .filter(([, station]) => station.lowMHz < filing.upperMHz && station.highMHz > filing.lowerMHz)
    .map(([id, station]) => ({ id, ...station }));
  return {
    issue: entry.publication.issue, synthetic: true, filing,
    reviewTrigger: filing.reviewTrigger,
    pfdCalculation: filing.pfdScreening ?? null,
    affectedFinnishFrequencies: stations,
    provenance: { filename: entry.filename, sha256: entry.sha256, uploadedAt: entry.uploadedAt, finnishSource: pfdMeta.inputs.finland },
    scope: "Uploaded synthetic evidence, not verified ITU findings. PFD supplied unchanged; affected frequencies use the same national-list band lookup as the desk, not interference or clearance.",
  };
}
export function uploadedEvidencePage(entries: InboxEntry[], issues: number[], offset: number, filingId: string | null = null) {
  const selected = entries.filter((e) => issues.length === 0 || issues.includes(e.publication.issue));
  const rows = selected.flatMap((entry) => entry.publication.filings
    .filter((f) => !filingId || f.id === filingId)
    .map((filing) => ({ entry, filing })));
  return {
    publications: selected.map((e) => ({ issue: e.publication.issue, total: e.publication.filings.length, sha256: e.sha256, synthetic: true })),
    missingIssues: issues.filter((issue) => !selected.some((e) => e.publication.issue === issue)),
    total: rows.length, offset, nextOffset: offset + 5 < rows.length ? offset + 5 : null,
    records: rows.slice(offset, offset + 5).map(({entry, filing}) => uploadedFilingEvidence(entry, filing)),
  };
}