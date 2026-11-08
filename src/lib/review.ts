export type ReviewRow = {
  id: string; issue: number; kind: "space" | "terrestrial"; name: string; administration: string;
  lowerMHz: number | null; upperMHz: number | null; frequencyRows: number; groupCount: number;
  matchedRows: number[]; status: string; classifications: string[]; actionRaw: string;
  source: { file: string; table: string; csvRow: number }; groupIds: string[];
  blockers: string[]; calculationScope: string;
};
export type ReviewArtifact = { scope: string; rows: ReviewRow[]; trends?: Array<{administration: string; previousIssue: number; currentIssue: number; previousPublicationRows: number; currentPublicationRows: number; difference: number; scope: string}> };

export function parseReviewArtifact(value: unknown): ReviewArtifact {
  if (!value || typeof value !== "object" || !("rows" in value) || !("scope" in value) || typeof value.scope !== "string" || !Array.isArray(value.rows) || value.rows.length > 100000) throw new Error("Expected an offline review artifact with scope and up to 100,000 rows.");
  for (const row of value.rows) {
    if (!row || typeof row !== "object" || !["space", "terrestrial"].includes(row.kind) || !Number.isInteger(row.issue) ||
      typeof row.id !== "string" || typeof row.name !== "string" || typeof row.administration !== "string" || typeof row.status !== "string" ||
      typeof row.actionRaw !== "string" || typeof row.calculationScope !== "string" || !Number.isInteger(row.frequencyRows) || !Number.isInteger(row.groupCount) ||
      !Array.isArray(row.matchedRows) || !row.matchedRows.every((n: unknown) => Number.isInteger(n)) ||
      !Array.isArray(row.classifications) || !row.classifications.every((s: unknown) => typeof s === "string") ||
      !Array.isArray(row.groupIds) || !row.groupIds.every((s: unknown) => typeof s === "string") ||
      !Array.isArray(row.blockers) || !row.blockers.every((s: unknown) => typeof s === "string") ||
      !row.source || typeof row.source.file !== "string" || typeof row.source.table !== "string" || !Number.isInteger(row.source.csvRow) ||
      ![row.lowerMHz,row.upperMHz].every(n => n === null || (typeof n === "number" && Number.isFinite(n)))) throw new Error("Invalid review row. Export the documented review schema first; raw MDB files cannot be opened here.");
  }
  // Imported trend data is not trusted; only the bundled verified artifact supplies trends.
  return { scope: value.scope, rows: value.rows as ReviewRow[] };
}

export function correspondence(row: ReviewRow) {
  return `DRAFT — expert approval required; not sent\n\nTo: Administration ${row.administration} (recipient/contact to be verified)\nSubject: Request for technical clarification — BR IFIC ${row.issue}, ${row.name}, reference ${row.id}\n\nDear colleagues,\n\nWe are reviewing the above filing in relation to Finnish radio-frequency use. The reported frequency envelope is ${row.lowerMHz ?? "unresolved"}–${row.upperMHz ?? "unresolved"} MHz. This envelope may contain disjoint intervals; the source artifact must be checked. ${row.matchedRows.length} supplied Finnish Excel source rows are linked by frequency overlap.\n\nCurrent evidence: ${row.status}. ${row.calculationScope}. This preliminary review does not establish harmful interference or regulatory non-compliance.\n\nPlease clarify the following outstanding inputs:\n${row.blockers.map(b => `- ${b}`).join("\n")}\n\nSource: ${row.source.file}, table ${row.source.table}, CSV row ${row.source.csvRow}. Reported action/provision: ${row.actionRaw}.\n\nWe would welcome supporting technical information to complete an expert assessment. Applicable provisions, contact details and any formal response deadline must be verified before this draft is used.\n\nKind regards,\n[Authorized Finnish reviewer]`;
}

export function downloadText(content: string, filename: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}