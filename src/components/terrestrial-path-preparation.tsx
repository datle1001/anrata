import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import preparation from "@/data/terrestrial3076-example-preparation.json";
import calculation from "@/data/terrestrial3076-conditional-p1546.json";
import validation from "@/data/p1546-reference-validation.json";
import reference from "@/data/p1546-notice-reference.json";
import { p1546AssessmentSchema } from "@/lib/p1546-assessment";
import { P1546AssessmentView } from "./p1546-assessment";

const noticeAssessment = p1546AssessmentSchema.parse(reference);

export function TerrestrialPathPreparation() {
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(calculation, null, 2) + "\n"], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "terrestrial3076-conditional-p1546.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="border-t border-border py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Conditional P.1546 experiment</h2>
        <Button variant="outline" onClick={download}>
          <Download />
          Export P.1546 evidence
        </Button>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        {calculation.scope}. Two paths exceed the model’s 1–1,000 km distance range and are retained
        as unresolved, not cleared.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-center text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th className="pb-3">Finnish station</th>
              <th>Distance · km</th>
              <th>Bearing</th>
              <th>Model distance domain</th>
              <th>Field strength</th>
            </tr>
          </thead>
          <tbody>
            {preparation.paths.map((path) => (
              <tr key={path.station} className="border-b border-border">
                <td className="py-4 font-mono">{path.station}</td>
                <td>{path.distanceKm.toFixed(1)}</td>
                <td>{path.initialBearingDeg.toFixed(1)}°</td>
                <td>
                  {path.withinP1546DistanceDomain
                    ? "Within range · actual path pending"
                    : "Outside range · not extrapolated"}
                </td>
                <td>
                  {path.withinP1546DistanceDomain ? "Sensitivity cases below" : "Not calculated"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {calculation.paths
        .filter((path) => path.sensitivityScenarios.length > 0)
        .map((path) => (
          <div key={path.station} className="my-6 border-l-4 border-chart-1 bg-muted px-5 py-4">
            <h3 className="font-semibold">Station {path.station} · assumed homogeneous paths</h3>
            <dl className="mt-4 grid gap-4 md:grid-cols-2">
              {path.sensitivityScenarios.map((scenario) => (
                <div key={scenario.pathZone}>
                  <dt className="text-sm text-muted-foreground">
                    {scenario.pathZone === "Land" ? "All-land" : "All-cold-sea"} · conditional
                    total-channel field
                  </dt>
                  <dd className="mt-1 font-mono text-xl">
                    {scenario.fieldStrengthDbUvPerMTotalChannelConditional.toFixed(3)} dBµV/m
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">
              Not the actual mixed path, not a verified maximum, and not evidence of safety. No
              margin calculated.
            </p>
          </div>
        ))}
      <p className="my-5 text-sm text-muted-foreground">
        External model: {validation.referenceCaseCount} bundled reference cases across{" "}
        {validation.profileFileCount} profiles matched at eight-decimal output precision. This is
        not independent validation. Model omits climatic-region adjustment and one terrain
        correction.
      </p>
      <dl className="my-6 grid grid-cols-2 gap-5 md:grid-cols-4">
        {[
          ["Frequency", `${preparation.proposedModelInputs.frequencyMHz} MHz`],
          [
            "Conditional total ERP",
            `${preparation.proposedModelInputs.erpKwConditional.toFixed(3)} kW`,
          ],
          [
            "Conditional effective height",
            `${preparation.proposedModelInputs.effectiveHeightMConditional} m`,
          ],
          ["Criterion receiving height", `${preparation.proposedModelInputs.receiverHeightM} m`],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-mono text-sm">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        No 20 dBµV/m comparison: total-channel ERP is not verified power in a 25 kHz window.
        Necessary bandwidth does not establish channel spacing or uniform spectrum.
      </p>
      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-medium">
          Path assumptions & unresolved inputs
        </summary>
        <ul className="mt-4 list-inside list-disc space-y-3 text-sm text-muted-foreground">
          {[...preparation.assumptions, ...preparation.blockers].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
      <div className="mt-6 border-t border-border pt-6">
        <P1546AssessmentView assessment={noticeAssessment} supplied={false} />
      </div>
    </section>
  );
}
