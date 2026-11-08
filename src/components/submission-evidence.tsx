import { Download, ExternalLink, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import guidance from "@/data/organizer-guidance.json";
import spaceCsv from "@/data/ific3074-review-results.asset.json";
import terrestrialCsv from "@/data/ific3076-review-results.asset.json";
import screening from "@/data/ific3074-pfd-screening.json";
import propagation from "@/data/terrestrial3076-conditional-p1546.json";
import m4 from "@/data/m4-evidence-summary.json";
import m4Asset from "@/data/m4-evidence.asset.json";
import m4Raw from "@/data/m4-allocation-raw.asset.json";
import audit from "@/data/challenge-audit.asset.json";
import { downloadText } from "@/lib/review";

const sources = [
  [
    "Space BR IFIC / Space Explorer",
    "https://www.itu.int/itu-r/space/apps/public/spaceexplorer/networks-explorer",
  ],
  [
    "Terrestrial BR IFIC & Preface",
    "https://www.itu.int/en/itu-r/terrestrial/brific/brific/preface/preface_en.pdf",
  ],
  [
    "M4 · Finnish frequency regulation",
    "https://www.finlex.fi/fi/viranomaiset/maarayskokoelmat/traficom-viestinta/2026/3",
  ],
  ["M4 · frequency allocation API", "https://opendata.traficom.fi/api/v13/Taajuusjakotaulukko"],
  ["ITU Radio Regulations", "https://www.itu.int/pub/r-reg-rr"],
  ["CEPT/ECC harmonisation sources", "https://docdb.cept.org/implementation/overview"],
  [
    "Finnish territorial-water boundaries",
    "https://avoindata.suomi.fi/data/dataset/aluevesien-rajat",
  ],
] as const;

export function SubmissionEvidence() {
  return (
    <details className="mb-6 border-y border-border py-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Submission evidence & source coverage
      </summary>
      <div className="mt-5 min-w-0 space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <FileCheck2 className="size-5" />
            3074 / 3076 accuracy-review files
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            CSV outputs retain frequency candidates and unresolved cases. They are not complete
            interference calculations or expert-labelled accuracy benchmarks.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={audit.url} download="challenge-audit.md">
                <Download />
                Challenge audit report
              </a>
            </Button>
            {[spaceCsv, terrestrialCsv].map((asset) => (
              <Button key={asset.asset_id} variant="outline" asChild>
                <a href={asset.url} download={asset.original_filename}>
                  <Download />
                  {asset.original_filename}
                </a>
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                downloadText(
                  JSON.stringify(screening, null, 2) + "\n",
                  "ific3074-pfd-screening.json",
                  "application/json",
                )
              }
            >
              <Download />
              Stored Space PFD
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadText(
                  JSON.stringify(propagation, null, 2) + "\n",
                  "terrestrial3076-conditional-p1546.json",
                  "application/json",
                )
              }
            >
              <Download />
              Conditional P.1546
            </Button>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="min-w-0">
            <h3 className="font-semibold">Organizer Q&A · implementation coverage</h3>
            <p className="mt-2 text-xs text-muted-foreground">{guidance.scope}</p>
            <dl className="mt-3 divide-y divide-border">
              {guidance.rules.map((rule) => (
                <div key={rule.id} className="py-3">
                  <dt className="flex flex-wrap justify-between gap-2 text-sm font-medium">
                    <span>{rule.topic}</span>
                    <span className={rule.state === "Partial" ? "text-chart-1" : "text-chart-2"}>
                      {rule.state}
                    </span>
                  </dt>
                  <dd className="mt-2 text-sm text-muted-foreground">
                    {rule.answer}
                    <p className="mt-2">{rule.gap}</p>
                    <p className="mt-1 text-xs">Supplied Q&A · lines {rule.sourceLines}</p>
                  </dd>
                </div>
              ))}
            </dl>
            <Button
              variant="outline"
              onClick={() =>
                downloadText(
                  JSON.stringify(guidance, null, 2) + "\n",
                  "organizer-guidance.json",
                  "application/json",
                )
              }
            >
              <Download />
              Q&A coverage
            </Button>
          </section>
          <section className="min-w-0">
            <h3 className="font-semibold">Reference sources</h3>
            <div className="mt-3 border-l-2 border-secondary pl-3">
              <h4 className="text-sm font-semibold">M4 · official allocation snapshot</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                {m4.metrics.m4Rows.toLocaleString()} source rows ·{" "}
                {m4.metrics.terrestrialM4MatchesWithoutExcel.toLocaleString()} terrestrial rows have
                allocation overlap without an Excel match. These are not interference findings.
                Space comparison covers the retained Excel-overlap pool only.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Retrieved {m4.retrievedAt.slice(0, 10)} · source hash retained in exported evidence.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={m4Asset.url} download="m4-evidence.json">
                    <Download />
                    M4 interval evidence
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={m4Raw.url} download="m4-allocation-raw.json">
                    <Download />
                    Original M4 snapshot
                  </a>
                </Button>
              </div>
            </div>
            <ul className="mt-3 divide-y divide-border">
              {sources.map(([label, url]) => (
                <li key={url} className="py-3">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-2 text-sm text-primary underline underline-offset-4"
                  >
                    <ExternalLink className="mt-0.5 size-4 shrink-0" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
            <h3 className="mt-5 font-semibold">Not yet established</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Comprehensive M4/licence-exempt and Finnish satellite protection; non-GSO/EPFD and
              AP30-family analysis; actual terrestrial border-path predictions; independently
              verified case accuracy; authorized automatic IFIC acquisition. A source link alone is
              not evidence that its rules were applied.
            </p>
          </section>
        </div>
      </div>
    </details>
  );
}
