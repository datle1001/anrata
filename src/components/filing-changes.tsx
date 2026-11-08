import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeValue, hasEarlierFilingMatch, type FilingChanges } from "@/lib/filing-changes";
import { downloadText } from "@/lib/review";

export function FilingChangesView({
  changes,
  currentIssue,
  networkName,
  currentFilingId,
}: {
  changes: FilingChanges;
  currentIssue: number;
  networkName: string;
  currentFilingId: string;
}) {
  if (!hasEarlierFilingMatch(changes, currentIssue)) return null;
  const baseline = changes.baseline;
  return (
    <section
      aria-label="Filing changes"
      className="min-w-0 space-y-3 border-l-2 border-secondary pl-4"
    >
      <h3 className="text-xs font-semibold text-secondary">CHANGES</h3>
      <p className="text-lg font-semibold">
        {changes.status === "changed"
          ? `${networkName} in IFIC ${currentIssue} matches a previously uploaded filing in IFIC ${baseline?.issue}: ${changes.fields.length} changed field(s).`
          : `${networkName} in IFIC ${currentIssue} repeats the supplied data from IFIC ${baseline?.issue}; no compared field has changed.`}
      </p>
      {baseline && (
        <p className="break-words text-xs text-muted-foreground">
          Compared with IFIC {baseline.issue} · notice {baseline.filingId} · {changes.matchBasis}.
          Candidate match, not a confirmed ITU modification.
        </p>
      )}
      {baseline && baseline.issue > currentIssue && (
        <p className="text-sm text-chart-1">
          This earlier publication was uploaded later. Before → after follows upload sequence, not
          IFIC chronology.
        </p>
      )}
      {changes.fields.length > 0 && (
        <dl className="divide-y divide-border">
          {changes.fields.map((field) => (
            <div key={field.path} className="py-3">
              <dt className="break-words font-mono text-xs font-semibold">{field.path}</dt>
              <dd className="mt-2 grid min-w-0 grid-cols-[1fr_auto_1fr] items-start gap-3 text-sm">
                <div className="min-w-0 break-words whitespace-pre-wrap">
                  <span className="block text-xs text-muted-foreground">
                    IFIC {baseline?.issue} · before
                  </span>
                  {changeValue(field.before, field.beforePresent)}
                </div>
                <ArrowRight className="mt-4 size-4 text-muted-foreground" />
                <div className="min-w-0 break-words whitespace-pre-wrap font-medium">
                  <span className="block text-xs text-muted-foreground">
                    IFIC {currentIssue} · after
                  </span>
                  {changeValue(field.after, field.afterPresent)}
                </div>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {baseline?.filingId !== currentFilingId && (
        <p className="break-words text-xs text-muted-foreground">
          Notice provenance: {baseline?.filingId} → {currentFilingId}. Notice IDs identify each
          publication record and are excluded from the data-change count.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        All supplied data is compared recursively; Space root notice IDs are shown separately as
        provenance. Missing inputs remain unresolved. No PFD / propagation recalculation or
        compliance conclusion.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          downloadText(
            changes.artifactJson,
            `filing-changes-from-${baseline?.issue ?? "none"}.json`,
            "application/json",
          )
        }
      >
        <Download />
        Changes evidence
      </Button>
    </section>
  );
}
