import { useState } from "react";
import { Download, RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";
import summary from "@/data/terrestrial3076-screening-summary.json";
import asset from "@/data/terrestrial3076-screening.asset.json";
import { TerrestrialPathPreparation } from "@/components/terrestrial-path-preparation";
import { ClientOnly } from "@tanstack/react-router";
import { TerrestrialQueue } from "@/components/terrestrial-queue";
import { TerrestrialUploadQueue } from "./terrestrial-upload-queue";

export function TerrestrialEvidence() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const record = summary.example;
  const metrics = summary.metrics;
  async function download() {
    setDownloading(true);
    setError("");
    try {
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error("Evidence download unavailable. Please try again.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = asset.original_filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Evidence download unavailable.");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <div className="evidence-desk">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="mb-3 text-sm text-primary">
            TERRESTRIAL IFIC {summary.issue} / INPUT EVIDENCE
          </p>
          <h1 className="flex items-center gap-3 text-3xl font-semibold">
            <RadioTower className="shrink-0" />
            Land-mobile review
          </h1>
        </div>
        <Button variant="outline" disabled={downloading} onClick={download}>
          <Download />
          {downloading ? "Downloading…" : "Export terrestrial evidence"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="my-6 border-l-2 border-chart-1 pl-4">
        <strong>Frequency overlap — not an interference finding</strong>
        <p className="mt-2 text-sm text-muted-foreground">{summary.scope}</p>
      </div>
      <ClientOnly
        fallback={
          <p className="py-8 text-muted-foreground">
            Loading stored Terrestrial IFIC 3076 notices…
          </p>
        }
      >
        <>
          <TerrestrialUploadQueue />
          <TerrestrialQueue />
        </>
      </ClientOnly>
      <details className="border-t border-border pt-5">
        <summary className="cursor-pointer font-semibold">
          Offline preparation summary & reference case
        </summary>
        <dl className="grid grid-cols-2 gap-6 border-y border-border py-7 md:grid-cols-4">
          {[
            ["Foreign FB / ML rows", metrics.foreignLandMobilePublicationRows],
            ["Excel overlap", metrics.excelOverlapRows],
            ["Overlap with reported point", metrics.overlapRowsWithReportedPoint],
            ["Finnish intervals unresolved", metrics.finnishRowsWithoutInterval],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-2 text-3xl font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <section className="grid gap-8 border-b border-border py-8 md:grid-cols-2">
          <div>
            <h2 className="mb-4 text-lg font-semibold">Overlap by administration</h2>
            <dl className="space-y-3">
              {Object.entries(metrics.overlapAdministrations).map(([adm, count]) => (
                <div key={adm} className="flex justify-between border-b border-border pb-2">
                  <dt className="font-mono">{adm}</dt>
                  <dd>{count} notices</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="mb-4 text-lg font-semibold">Unresolved relevance</h2>
            <p className="text-sm text-muted-foreground">
              1,658 rows have no Excel overlap. They are retained, not cleared: national
              allocations, adjacent frequencies and border / territorial-sea relevance remain
              unassessed.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">{summary.frequencyScope}</p>
          </div>
        </section>
        {record && (
          <>
            <section className="border-b border-border py-8">
              <h2 className="mb-4 text-lg font-semibold">
                Source case · {record.notice.raw.adm} / {record.notice.raw.assgn_id}
              </h2>
              <dl className="grid grid-cols-2 gap-5 md:grid-cols-4">
                {[
                  ["Station class", record.notice.raw.stn_cls],
                  [
                    "Reported frequency",
                    `${record.notice.raw.freq_min}–${record.notice.raw.freq_max} MHz`,
                  ],
                  ["Raw action", record.notice.raw.intent],
                  ["Provision", record.notice.raw.prov],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="mt-1 break-words font-mono text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 break-words text-sm text-muted-foreground">
                {record.notice.source.file} · {record.notice.source.table} · CSV row{" "}
                {record.notice.source.csvRow} · terrakey {record.notice.raw.terrakey}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Actual-path field strength: unresolved. Conditional P.1546 sensitivity cases appear
                below. Coordination applicability and spectrum remain unconfirmed; the reported
                provision is preserved.
              </p>
            </section>
            <section className="py-8">
              <h2 className="mb-4 text-lg font-semibold">Matched Finnish reception intervals</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-center text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="pb-3">Station</th>
                      <th>Excel row</th>
                      <th>Basis</th>
                      <th>Protected interval · MHz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.matchedFinnishRows.map((row) => (
                      <tr key={row.source.row} className="border-b border-border">
                        <td className="py-4 font-mono">{row.station}</td>
                        <td>{row.source.row}</td>
                        <td>{row.protectedFrequencyBasis}</td>
                        <td>
                          {row.lowerMHz}–{row.upperMHz}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="grid gap-8 border-t border-border py-8 md:grid-cols-2">
              <div>
                <h2 className="mb-4 text-lg font-semibold">Outstanding checks</h2>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {record.blockers.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="mb-4 text-lg font-semibold">Reported transmitter locations</h2>
                {record.transmitterLocations.map((location, i) => (
                  <div key={`${location.geoKey}-${i}`} className="mb-5">
                    <p className="text-sm">
                      {location.origin} · geographic key {location.geoKey}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {location.reportedPoint
                        ? `${location.reportedPoint.latitudeDeg.toFixed(5)}°, ${location.reportedPoint.longitudeDeg.toFixed(5)}° · datum unverified`
                        : "No validated point location"}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {location.antennaEvidence.length} antenna records · power and height semantics
                      unverified
                    </p>
                  </div>
                ))}
                <details>
                  <summary className="cursor-pointer text-sm font-medium">
                    Raw notice, joins & antenna evidence
                  </summary>
                  <pre className="mt-4 max-h-96 overflow-auto bg-muted p-4 font-mono text-xs">
                    {JSON.stringify(record, null, 2)}
                  </pre>
                </details>
              </div>
            </section>
          </>
        )}
        <TerrestrialPathPreparation />
      </details>
    </div>
  );
}
