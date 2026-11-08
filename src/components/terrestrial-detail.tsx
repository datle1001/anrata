import { useState } from "react";
import { Download, FileText, BookOpenCheck, ShieldQuestion, RadioTower } from "lucide-react";
import { terrestrialExpertChecks } from "@/lib/terrestrial-expert-checks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TerrestrialPathPreparation } from "@/components/terrestrial-path-preparation";
import preparation from "@/data/terrestrial3076-example-preparation.json";
import { buildLetterDocx, saveBlob } from "@/lib/dossier-files";
import {
  hasOverlap,
  intervalLabel,
  siteName,
  terrestrialLetter,
  terrestrialTier,
  tierStyle,
  type ReviewState,
  type TerrestrialRow,
} from "@/lib/terrestrial-review";

export function TerrestrialDetail({
  row,
  state,
  updatedAt,
  onState,
  onClose,
}: {
  row: TerrestrialRow;
  state: ReviewState;
  updatedAt?: string | undefined;
  onState: (state: ReviewState) => void;
  onClose: () => void;
}) {
  const [letterOpen, setLetterOpen] = useState(false);
  const [draft, setDraft] = useState(() => terrestrialLetter(row));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const raw = row.notice.raw;
  const expertChecks = terrestrialExpertChecks(row);
  const example = raw.terrakey === preparation.noticeEvidence.raw.terrakey;
  async function exportWord() {
    setExporting(true);
    setError("");
    try {
      saveBlob(await buildLetterDocx(draft), `draft-coordination-3076-${raw.terrakey}.docx`);
    } catch {
      setError("Word draft could not be exported. Please try again.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="pr-6 break-words">
              {siteName(row)} · {raw.adm}
            </DialogTitle>
            <DialogDescription>
              Terrestrial IFIC 3076 · terrakey {raw.terrakey} · assignment{" "}
              {raw.assgn_id || "not reported"}
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm">
            <span
              className={`inline-block rounded border px-2 py-1 capitalize ${tierStyle[terrestrialTier(raw.adm).tier]}`}
            >
              {terrestrialTier(raw.adm).tier} geographic review priority
            </span>
            <p className="mt-2 text-muted-foreground">
              {terrestrialTier(raw.adm).reason} Team triage only; not a calculated interference
              finding.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-y border-border py-3">
            <span className="mr-auto text-sm text-chart-1">
              {hasOverlap(row)
                ? "Excel overlap · review required"
                : "No Excel overlap · relevance unresolved"}
            </span>
            <Button
              variant="outline"
              onClick={() => onState(state === "in-review" ? "unreviewed" : "in-review")}
            >
              {state === "in-review" ? "Return to unreviewed" : "Start review"}
            </Button>
            <Button onClick={() => onState(state === "completed" ? "unreviewed" : "completed")}>
              {state === "completed" ? "Reopen review" : "Mark as Reviewed"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Workflow:{" "}
            {state === "completed"
              ? "Reviewed"
              : state === "in-review"
                ? "In review"
                : "Unreviewed"}
            {updatedAt ? ` · ${new Date(updatedAt).toLocaleString()}` : ""} · saved in this browser;
            not a technical verdict.
          </p>
          <dl className="grid grid-cols-2 gap-4 border-b border-border pb-5 sm:grid-cols-4">
            {[
              ["Frequency interval", intervalLabel(row)],
              ["Assigned frequency", `${raw.freq_assgn || "?"} MHz`],
              ["Station class / type", `${raw.stn_cls} / ${raw.stn_type}`],
              ["Emission / bandwidth code", `${raw.emi_cls || "?"} / ${raw.bdwdth_cde || "?"}`],
              ["Reported provision", raw.prov || "Not reported"],
              ["Raw notification action", raw.intent || "Not reported"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words text-sm">{value}</dd>
              </div>
            ))}
          </dl>
          <section>
            <h3 className="mb-3 font-semibold">Reported transmitter evidence</h3>
            {row.transmitterLocations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No associated transmitter location reported.
              </p>
            )}
            {row.transmitterLocations.map((location, i) => (
              <div key={`${location.geoKey}-${i}`} className="border-b border-border py-3">
                <p className="text-sm">
                  {location.origin} · geographic key {location.geoKey}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {location.reportedPoint
                    ? `${location.reportedPoint.latitudeDeg.toFixed(5)}°, ${location.reportedPoint.longitudeDeg.toFixed(5)}° · reported point, datum unverified`
                    : "Geographic area / missing point · no point-site distance inferred"}
                </p>
                {location.antennaEvidence.map((antenna, index) => (
                  <dl key={index} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ["Raw power · pwr_dbw", antenna.raw.pwr_dbw],
                      ["Power type · pwr_eiv", antenna.raw.pwr_eiv],
                      ["Height AGL · hgt_agl", antenna.raw.hgt_agl],
                      ["Effective height · eff_hgtmax", antenna.raw.eff_hgtmax],
                      ["Azimuth · azm_max_e", antenna.raw.azm_max_e],
                      ["Gain · gain_max", antenna.raw.gain_max],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="text-sm">{value || "Not reported"}</dd>
                      </div>
                    ))}
                  </dl>
                ))}
              </div>
            ))}
            <p className="mt-3 text-xs text-muted-foreground">
              Power type, spectrum, height semantics and directional joins require verification; raw
              numeric fields are not validated ERP.
            </p>
          </section>
          <section className="min-w-0">
            <h3 className="mb-3 font-semibold">
              Matched Finnish reception intervals · {row.matchedFinnishRows.length}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[470px] text-left text-sm">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="pb-2">Station</th>
                    <th>Interval · MHz</th>
                    <th>Basis</th>
                    <th>Excel row</th>
                    <th>Stored distance</th>
                  </tr>
                </thead>
                <tbody>
                  {row.matchedFinnishRows.map((match, i) => (
                    <tr key={`${match.station}-${i}`} className="border-b border-border">
                      <td className="py-3">{match.station}</td>
                      <td>
                        {match.lowerMHz}–{match.upperMHz}
                      </td>
                      <td>{match.protectedFrequencyBasis}</td>
                      <td>{match.source.row}</td>
                      <td>
                        {example
                          ? `${preparation.paths.find((p) => p.station === match.station)?.distanceKm.toFixed(1) ?? "Not prepared"} km`
                          : "Not prepared"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!hasOverlap(row) && (
              <p className="py-3 text-sm text-muted-foreground">
                No direct Excel match; national, adjacent-band and geographic relevance has not been
                cleared.
              </p>
            )}
            <p className="mt-3 break-words text-xs text-muted-foreground">
              {row.matchedFinnishRows[0]?.source.file} · {row.matchedFinnishRows[0]?.source.sheet}
            </p>
          </section>
          <section
            className="expert-checks border-t border-border pt-5"
            aria-label="National register and coordination checks"
          >
            <h3 className="mb-4 text-lg font-semibold">Coordination & protection checks</h3>
            {[
              {
                icon: BookOpenCheck,
                title: "National register cross-check",
                status: "Unverified",
                detail: expertChecks.register.detail,
              },
              {
                icon: ShieldQuestion,
                title: "Licence-exempt M4 scope",
                status: "Not assessed",
                detail: expertChecks.licenceExempt.detail,
              },
              {
                icon: RadioTower,
                title: "T/R 25-08 · border & territorial sea",
                status: "Applicability unconfirmed",
                detail: expertChecks.coordination.detail,
              },
            ].map(({ icon: Icon, title, status, detail }) => (
              <div key={title} className="flex gap-3 border-b border-border py-4">
                <Icon className="mt-1 size-5 shrink-0 text-secondary" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">{title}</h4>
                    <span className="text-xs text-chart-1">{status}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p>
                </div>
              </div>
            ))}
            <p className="mt-3 text-xs text-muted-foreground">
              Reported provision: {raw.prov || "Not reported"} · {row.notice.source.table}, row{" "}
              {row.notice.source.csvRow}. No agreement, exemption or selected threshold is inferred.
            </p>
          </section>
          <section className="border-t border-border pt-4">
            <h3 className="font-semibold">P.1546 / coordination assessment</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Actual-path field strength at the Finnish border / territorial sea: unresolved.
              Applicable coordination threshold and spectrum conversion: unconfirmed. No safe /
              interference verdict.
            </p>
            {example && <TerrestrialPathPreparation />}
          </section>
          <section>
            <h3 className="font-semibold">Outstanding checks</h3>
            <ul className="mt-2 list-inside list-disc space-y-2 text-sm text-muted-foreground">
              {row.blockers.map((blocker, i) => (
                <li key={i}>{blocker}</li>
              ))}
            </ul>
          </section>
          <details>
            <summary className="cursor-pointer text-sm">
              Source notice, joins and antenna records
            </summary>
            <p className="my-3 break-words text-xs text-muted-foreground">
              {row.notice.source.file} · {row.notice.source.table} · CSV row{" "}
              {row.notice.source.csvRow}
            </p>
            <pre className="max-h-72 overflow-auto bg-muted p-3 text-xs">
              {JSON.stringify(row, null, 2)}
            </pre>
          </details>
          <Button
            variant="outline"
            className="justify-self-start"
            onClick={() => setLetterOpen(true)}
          >
            <FileText />
            Draft coordination letter
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={letterOpen} onOpenChange={setLetterOpen}>
        <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Coordination draft · {raw.adm} / {raw.terrakey}
            </DialogTitle>
            <DialogDescription>
              Selected evidence only · expert approval required · not sent
            </DialogDescription>
          </DialogHeader>
          <Textarea
            aria-label="Terrestrial coordination draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[45dvh] text-sm"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button disabled={exporting} onClick={() => void exportWord()}>
            <Download />
            {exporting ? "Exporting…" : "Download Word draft"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
