import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import artifact from "@/data/territorial-sea-evaluation-points.json";
import settings from "@/data/geographic-screening-settings.json";
import national from "@/data/geographic-evaluation-summary.json";
import nationalAsset from "@/data/geographic-evaluation-points.asset.json";
import geographic from "@/data/space3074-geographic-example.json";
import { downloadText } from "@/lib/review";

export function GeographicEvidence() {
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(artifact, null, 2) + "\n"], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "territorial-sea-evaluation-points.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="mx-auto max-w-6xl border-t border-border px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Geographic evaluation evidence</h2>
        <Button variant="outline" onClick={download}>
          <Download />
          Export geographic points
        </Button>
      </div>
      <dl className="my-6 grid grid-cols-2 gap-6 md:grid-cols-4">
        <div>
          <dt className="text-sm text-muted-foreground">Territorial-sea points</dt>
          <dd className="mt-2 text-2xl font-medium">{artifact.pointCount}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Source line features</dt>
          <dd className="mt-2 text-2xl font-medium">{artifact.featureCount}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Boundary sampling</dt>
          <dd className="mt-2 text-2xl font-medium">{artifact.boundaryMaximumStepKm} km</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Band priority</dt>
          <dd className="mt-2 text-2xl font-medium">{settings.bandPriority}</dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        {artifact.scope}. National footprint: {national.pointCounts.nationalGrid.toLocaleString()}{" "}
        grid points and {national.pointCounts.nationalPolygonBoundary.toLocaleString()}{" "}
        polygon-boundary samples. National boundary includes coastline, islands and inland waters;
        not a verified land-border-only layer.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <a href={nationalAsset.url} download="geographic-evaluation-points.json">
            <Download />
            Export national points
          </a>
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            downloadText(
              JSON.stringify(geographic, null, 2) + "\n",
              "space3074-geographic-example.json",
              "application/json",
            )
          }
        >
          <Download />
          Export sampled PFD
        </Button>
      </div>
      <h3 className="mt-7 font-semibold">{geographic.networkName} · conditional sample maxima</h3>
      <p className="my-3 text-sm text-muted-foreground">
        Nominal GSO, worst-case pointing, separate emission alternatives. Not continuous maxima,
        validated beam aggregates or regulatory verdicts. Limits and margins remain unresolved.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-center text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="py-3">Sample group</th>
              <th>Emission</th>
              <th>Points</th>
              <th>PFD · dBW/m² / 4 kHz</th>
            </tr>
          </thead>
          <tbody>
            {geographic.results.map((r) => (
              <tr key={`${r.sampleGroup}-${r.emissionCsvRow}`} className="border-b border-border">
                <td className="py-3">{r.sampleGroup}</td>
                <td className="font-mono">{r.emissionRaw.design_emi}</td>
                <td>{r.sampleCount.toLocaleString()}</td>
                <td className="font-mono">
                  {r.sampleMaximumConditionalPfdDbwM2In4kHz?.toFixed(3) ?? "Below horizon"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Initial review buffer: {settings.nearLimitMarginDb} dB, team-selected and not applied to
        existing results. Configurable offline; applicable limits remain unchanged.
      </p>
      <a
        href={artifact.catalogUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-block text-sm text-primary underline"
      >
        Traficom territorial-waters source
      </a>
      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-medium">
          National source, dates and limitations
        </summary>
        <p className="mt-3 text-sm text-muted-foreground">
          geoBoundaries gbOpen FIN ADM0 full · represented year 2017 · source updated January 2023 ·
          build December 2023. © OpenStreetMap contributors / Wambacher, geoBoundaries; ODbL 1.0.
        </p>
        <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          {national.qualifications.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {national.sources.map((source) => (
          <p key={source.role} className="mt-4 break-all font-mono text-xs">
            {source.selectedLayer} · SHA256 {source.sha256}
          </p>
        ))}
      </details>
      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-medium">
          Source and sampling qualifications
        </summary>
        <p className="mt-3 break-all font-mono text-xs">
          {artifact.layer} · SHA256 {artifact.rawSha256}
        </p>
        <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
          {artifact.qualifications.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
