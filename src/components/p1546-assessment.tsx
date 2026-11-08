import { Download } from "lucide-react";
import { Button } from "./ui/button";
import type { P1546Assessment } from "@/lib/p1546-assessment";
import { downloadText } from "@/lib/review";

export function P1546AssessmentView({
  assessment,
  supplied = true,
}: {
  assessment: P1546Assessment;
  supplied?: boolean;
}) {
  return (
    <section className="min-w-0 space-y-4" aria-label="Stored P.1546 assessment">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">P.1546-6 · stored conditional assessment</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadText(
              JSON.stringify(assessment, null, 2),
              `p1546-${assessment.noticeId}.json`,
              "application/json",
            )
          }
        >
          <Download />
          P.1546 evidence
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{assessment.scope}</p>
      <p className="text-xs text-chart-1">
        {supplied
          ? "Supplied offline artifact · model execution and input claims not authenticated by upload."
          : "Bundled offline reference experiment · not an uploaded-notice calculation."}{" "}
        No safety or interference verdict.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-center text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="py-3">Target / scenario</th>
              <th>Distance · km</th>
              <th>Field · dBµV/m</th>
              <th>Loss · dB</th>
              <th>Trigger · dBµV/m</th>
              <th>Field − trigger · dB</th>
            </tr>
          </thead>
          <tbody>
            {assessment.paths.map((path) => (
              <tr className="border-b border-border" key={path.id}>
                <td className="max-w-48 py-3 break-words">
                  {path.target}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {path.status === "conditional" ? "Conditional sample" : "Unresolved"}
                  </span>
                </td>
                <td>{path.distanceKm?.toFixed(1) ?? "—"}</td>
                <td>{path.fieldStrengthDbUvPerM?.toFixed(3) ?? "—"}</td>
                <td>{path.basicTransmissionLossDb?.toFixed(3) ?? "—"}</td>
                <td>{path.comparison.thresholdDbUvPerM?.toFixed(2) ?? "Unconfirmed"}</td>
                <td>{path.comparison.marginDb?.toFixed(3) ?? "Unresolved"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {assessment.paths.map((path) => (
        <details
          key={path.id}
          className="border-b border-border pb-3"
          open={path.status === "unresolved"}
        >
          <summary className="cursor-pointer break-words text-sm font-medium">
            {path.target} · inputs & outstanding checks
          </summary>
          <p className="mt-3 text-xs text-muted-foreground">{path.comparison.reason}</p>
          <ul className="my-3 list-inside list-disc space-y-2 text-xs text-muted-foreground">
            {[...path.blockers, ...path.assumptions].map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
          <pre className="max-h-64 overflow-auto bg-muted p-3 text-xs">
            {JSON.stringify(path.inputs, null, 2)}
          </pre>
        </details>
      ))}
      <details>
        <summary className="cursor-pointer text-sm">Model, provenance & validation limits</summary>
        <ul className="my-3 list-inside list-disc space-y-2 text-xs text-muted-foreground">
          {assessment.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{assessment.provenance.validationScope}</p>
        <pre className="mt-3 max-h-60 overflow-auto bg-muted p-3 text-xs">
          {JSON.stringify(assessment.provenance, null, 2)}
        </pre>
      </details>
    </section>
  );
}
