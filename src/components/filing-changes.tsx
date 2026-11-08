import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { changeValue, type FilingChanges } from "@/lib/filing-changes";
import { downloadText } from "@/lib/review";

export function FilingChangesView({ changes }: { changes: FilingChanges }) {
  const baseline = changes.baseline;
  return <section aria-label="Filing changes" className="min-w-0 space-y-3 border-l-2 border-secondary pl-4">
    <h3 className="text-xs font-semibold text-secondary">CHANGES</h3>
    <p className="text-lg font-semibold">
      {changes.status === "changed" ? `Repeated filing candidate from IFIC ${baseline?.issue}: ${changes.fields.length} changed field(s).`
        : changes.status === "unchanged" ? `No supplied field changes from IFIC ${baseline?.issue}.`
        : changes.status === "ambiguous" ? "Multiple earlier matches — identity needs expert confirmation."
        : "No earlier uploaded filing matched."}
    </p>
    {baseline && <p className="break-words text-xs text-muted-foreground">Compared with IFIC {baseline.issue} · notice {baseline.filingId} · {changes.matchBasis}. Candidate match, not a confirmed ITU modification.</p>}
    {changes.fields.length > 0 && <dl className="divide-y divide-border">
      {changes.fields.map((field) => <div key={field.path} className="py-3">
        <dt className="break-words font-mono text-xs font-semibold">{field.path}</dt>
        <dd className="mt-2 grid min-w-0 grid-cols-[1fr_auto_1fr] items-start gap-3 text-sm">
          <div className="min-w-0 break-words whitespace-pre-wrap"><span className="block text-xs text-muted-foreground">IFIC {baseline?.issue} · before</span>{changeValue(field.before, field.beforePresent)}</div>
          <ArrowRight className="mt-4 size-4 text-muted-foreground" />
          <div className="min-w-0 break-words whitespace-pre-wrap font-medium"><span className="block text-xs text-muted-foreground">Current · after</span>{changeValue(field.after, field.afterPresent)}</div>
        </dd>
      </div>)}
    </dl>}
    <p className="text-xs text-muted-foreground">Only supplied fields are compared. Unlisted fields are unchanged in this comparison; missing inputs remain unresolved. No PFD recalculation or compliance conclusion.</p>
    <Button variant="outline" size="sm" onClick={() => downloadText(changes.artifactJson, `filing-changes-from-${baseline?.issue ?? "none"}.json`, "application/json")}><Download />Changes evidence</Button>
  </section>;
}