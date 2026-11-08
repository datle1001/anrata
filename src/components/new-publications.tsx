import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, Download, Eye } from "lucide-react";
import { LetterDialog } from "@/components/letter-dialog";
import { pfdMeta, type Station } from "@/lib/dossier";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/review";
import { relativeAge, type transferredSpaceRows } from "@/lib/space-desk";
import { useNow } from "@/hooks/use-now";
import { useDetailRead } from "@/hooks/use-detail-read";
import { detailReviewState, isUnreadFiling } from "@/lib/detail-review";

const badgeStyle: Record<string, string> = {
  exceeds: "text-destructive border-destructive/50",
  "near-limit": "text-chart-1 border-chart-1/50",
  within: "text-secondary border-secondary/50",
  "not-calculable": "text-muted-foreground border-border",
};
const statusLabel: Record<string, string> = {
  exceeds: "Above stored limit",
  "near-limit": "Inside review buffer",
  within: "Below stored limit",
  "not-calculable": "Unresolved",
};

export function SyntheticSpaceRecord({
  row,
  state,
  onState,
}: {
  row: ReturnType<typeof transferredSpaceRows>[number];
  state: string;
  onState: (id: string, next: string) => void;
}) {
  const { entry, filing, id } = row;
  const now = useNow();
  const { viewedAt, markRead } = useDetailRead(`${entry.sha256}:${filing.id}`);
  const unread = isUnreadFiling(state, viewedAt);
  const [open, setOpen] = useState(false);
  const pfd = filing.pfdScreening;
  const [letterOpen, setLetterOpen] = useState(false);
  const stations = useMemo(
    () =>
      Object.entries(pfdMeta.finnishStations as unknown as Record<string, Station>).filter(
        ([, st]) => st.lowMHz < filing.upperMHz && st.highMHz > filing.lowerMHz,
      ),
    [filing.lowerMHz, filing.upperMHz],
  );
  const worst = pfd?.groups.reduce<(typeof pfd.groups)[number] | undefined>(
    (m, g) => (!m || g.worstPoint.marginDb > m.worstPoint.marginDb ? g : m),
    undefined,
  );
  const makeLetter = () => {
    const over = (pfd?.groups ?? []).filter((g) => g.worstPoint.marginDb > 0);
    const classes = [...new Set(stations.map(([, st]) => st.class))].join(", ") || "n/a";
    const finding = over.length
      ? over
          .slice(0, 3)
          .map(
            (g) =>
              `   - ${g.freqLowMHz}–${g.freqHighMHz} MHz (group ${g.groupId}): stored PFD ${g.worstPoint.pfdDb.toFixed(1)} dB(W/m²) at arrival angle ${g.worstPoint.arrivalAngleDeg.toFixed(1)}°, exceeding the limit of ${g.worstPoint.limitDb.toFixed(1)} dB(W/m²) in ${g.citation.split(" (")[0]} by ${g.worstPoint.marginDb.toFixed(1)} dB.`,
          )
          .join("\n")
      : `   - The frequency band ${filing.lowerMHz}–${filing.upperMHz} MHz is used in Finland by ${stations.length} receiving station(s) (licence classes ${classes}).`;
    return `Diary number: [to be added by Traficom registry]
Date: ${new Date().toISOString().slice(0, 10)}

To: Administration of ${filing.administration}
Copy: ITU Radiocommunication Bureau

Subject: Comments of the Administration of Finland on the satellite network ${filing.name} (BR IFIC ${row.issue}, notice ID ${filing.id})

Dear Sir/Madam,

The Administration of Finland has examined the satellite network ${filing.name}, published in BR IFIC ${row.issue}.

Finland is concerned about the frequency band ${filing.lowerMHz}–${filing.upperMHz} MHz, used in Finland by ${stations.length} receiving station(s) (licence classes ${classes}).

According to the stored screening:
${finding}

Finland therefore requests that the Administration of ${filing.administration} ensures that Finnish services are protected.

Yours faithfully,

[Name]
[Title]
Finnish Transport and Communications Agency Traficom`;
  };
  const [letter, setLetter] = useState(makeLetter);
  return (
    <li className={`border-b border-border py-4 ${unread ? "border-l-2 border-l-primary" : ""}`}>
      <details className="group" open={open}>
        <summary
          className="flex cursor-pointer list-none items-center gap-4 px-4 py-0"
          onClick={(event) => {
            event.preventDefault();
            setOpen(!open);
            if (!open) {
              markRead();
              const next = detailReviewState(state);
              if (next !== state) onState(id, next);
            }
          }}
        >
          <span
            className={`w-20 shrink-0 rounded border py-1 text-center font-mono text-sm ${badgeStyle[pfd?.status ?? "not-calculable"]}`}
          >
            {pfd?.worstMarginDb !== undefined
              ? `${pfd.worstMarginDb > 0 ? "+" : ""}${pfd.worstMarginDb.toFixed(1)} dB`
              : "—"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 break-words font-medium">
              {filing.name}
              {unread && (
                <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  NEW
                </span>
              )}
              <span className="text-xs font-normal text-muted-foreground">
                {relativeAge(row.scannedAt, now)}
              </span>
            </span>
            <span className="block break-words text-sm text-muted-foreground">
              {filing.administration} · {filing.orbit} · {filing.lowerMHz}–{filing.upperMHz} MHz ·
              IFIC {row.issue} · <span className="text-chart-1">synthetic</span>
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {pfd
                ? "Stored offline PFD screening supplied with upload · not recomputed"
                : "No stored PFD calculation"}
            </span>
          </span>
          <span
            className={`max-w-28 text-xs ${(badgeStyle[pfd?.status ?? "not-calculable"] ?? "").split(" ")[0]}`}
          >
            {statusLabel[pfd?.status ?? "not-calculable"]}
            <span className="mt-1 block">{state}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mx-4 mt-4 space-y-5">
          <div className="border-l-2 border-secondary pl-4">
            <h3 className="mb-2 text-xs font-semibold text-secondary">REVIEW TRIGGER</h3>
            <p className="mb-3 text-lg font-semibold">
              {pfd?.worstMarginDb !== undefined
                ? `Stored sample margin ${pfd.worstMarginDb > 0 ? "+" : ""}${pfd.worstMarginDb.toFixed(1)} dB · applicability requires expert review`
                : "Frequency overlap · technical finding unresolved"}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              <li>
                Frequencies {filing.lowerMHz}–{filing.upperMHz} MHz overlap {stations.length}{" "}
                Finnish receiving station(s) in Traficom's national list (band lookup only, not
                interference).
              </li>
              {worst && worst.worstPoint.marginDb > 0 && (
                <li>
                  Stored sample maximum {worst.worstPoint.pfdDb.toFixed(1)} dB(W/m²),{" "}
                  {worst.worstPoint.marginDb.toFixed(1)} dB above the encoded {worst.citation}{" "}
                  limit. Not a compliance verdict.
                </li>
              )}
              {worst && worst.worstPoint.marginDb <= 0 && (
                <li>
                  Stored sample maximum is {Math.abs(worst.worstPoint.marginDb).toFixed(1)} dB below
                  the encoded limit; sample maxima are not continuous maxima or clearance.
                </li>
              )}
              {!pfd && <li>PFD not calculated: no stored screening supplied with the upload.</li>}
              <li>Supplied trigger, unverified: {filing.reviewTrigger}</li>
              <li>Finland visibility, supplied and unverified: {filing.visibility}</li>
              {filing.blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setLetterOpen(true)}>
                <Eye />
                Preview / edit letter
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onState(id, state === "completed" ? "unreviewed" : "completed")}
              >
                <CheckCircle2 />
                {state === "completed" ? "Reopen review" : "Complete review"}
              </Button>
              <span className="self-center text-xs text-muted-foreground">
                {state} · completion is not technical clearance
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Network", filing.name],
              ["Administration", filing.administration],
              ["Publication", `BR IFIC ${row.issue} · synthetic`],
              ["Notice ID", filing.id],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="break-words font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {pfd && (
            <div className="space-y-3 rounded-md border border-border p-4">
              <p className="text-sm font-semibold">
                PFD calculation ({pfd.groups.length} stored group(s)) — screening, not a compliance
                verdict
              </p>
              {pfd.reason && <p className="text-xs text-muted-foreground">{pfd.reason}</p>}
              {pfd.groups.map((g) => {
                const w = g.worstPoint;
                const bw = 10 * Math.log10(g.referenceBandwidthHz);
                return (
                  <div
                    key={g.groupId}
                    className="rounded bg-muted/40 p-3 font-mono text-xs leading-6"
                  >
                    <p className="font-sans text-sm font-semibold">
                      {(g.freqLowMHz / 1000).toFixed(2)}–{(g.freqHighMHz / 1000).toFixed(2)} GHz ·
                      group {g.groupId}
                      {g.beam ? ` · beam ${g.beam}` : ""}
                    </p>
                    <p>
                      Sample maximum point: {w.label} ({w.lat.toFixed(3)}° N, {w.lon.toFixed(3)}° E)
                    </p>
                    <p>
                      {g.inputs.satelliteLongitudeDeg !== undefined &&
                        `Satellite ${g.inputs.satelliteLongitudeDeg}° · `}
                      range {w.slantRangeKm.toFixed(1)} km · arrival angle{" "}
                      {w.arrivalAngleDeg.toFixed(1)}°
                    </p>
                    <p>PFD = PSD + G + 10log(BW) − 10log(4πd²)</p>
                    <p>
                      = {g.inputs.psdMaxDbwHz.toFixed(1)} + {g.inputs.gainMaxDbi.toFixed(1)} +{" "}
                      {bw.toFixed(1)} − {w.spreadingLossDb.toFixed(1)}
                    </p>
                    <p className="font-semibold">
                      = {w.pfdDb.toFixed(1)} dB(W/m²) in {g.referenceBandwidthHz / 1000} kHz
                    </p>
                    <p>
                      Limit at {w.arrivalAngleDeg.toFixed(1)}° = {w.limitDb.toFixed(1)} → margin{" "}
                      <span
                        className={
                          (
                            badgeStyle[
                              w.marginDb > 0 ? "exceeds" : w.marginDb > -3 ? "near-limit" : "within"
                            ] ?? ""
                          ).split(" ")[0]
                        }
                      >
                        {w.marginDb > 0 ? "+" : ""}
                        {w.marginDb.toFixed(1)} dB
                      </span>
                    </p>
                    <p className="font-sans text-muted-foreground">
                      Source: {g.citation}
                      {g.service ? ` — ${g.service}` : ""}
                    </p>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">
                Values are displayed exactly as stored in the uploaded file; the browser does not
                recalculate them.
              </p>
            </div>
          )}
          <details className="rounded-md border border-border p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Affected Finnish frequencies ({stations.length} stations)
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              Band lookup against Traficom's national list. Some may not be notified to the ITU.
            </p>
            <div className="mt-3 max-h-64 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1">Station</th>
                    <th>Class</th>
                    <th>RX band</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {stations.map(([sid, st]) => (
                    <tr key={sid} className="border-t border-border">
                      <td className="py-1">{sid}</td>
                      <td>{st.class}</td>
                      <td>{`${st.lowMHz.toFixed(2)}–${st.highMHz.toFixed(2)} MHz`}</td>
                      <td>
                        {st.lat != null ? `${st.lat.toFixed(2)}, ${st.lon?.toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <details className="rounded-md border border-border p-4 text-xs">
            <summary className="cursor-pointer text-sm font-semibold">Audit trail</summary>
            <ul className="mt-3 space-y-1 break-words text-muted-foreground">
              <li>
                Filing source: {entry.filename} · filing {filing.id}
              </li>
              <li>SHA-256 {entry.sha256}</li>
              <li>Scanned {relativeAge(row.scannedAt, now)}</li>
              <li>Finnish data: {pfdMeta.inputs.finland}</li>
              <li>
                PFD values:{" "}
                {pfd ? "stored in the uploaded file, displayed unchanged" : "none supplied"}
              </li>
            </ul>
            <button
              className="mt-3 text-secondary hover:underline"
              onClick={() => downloadText(entry.raw, entry.filename, "application/json")}
            >
              <Download className="mr-1 inline size-3" />
              Download original evidence (JSON)
            </button>
          </details>
          <LetterDialog
            title={filing.name}
            fileName={`Letter_${filing.name.replace(/\W+/g, "_")}_IFIC${row.issue}.docx`}
            reset={makeLetter}
            letter={letter}
            setLetter={setLetter}
            open={letterOpen}
            onOpenChange={setLetterOpen}
          />
          <p className="text-xs text-muted-foreground">
            Synthetic upload · completion is workflow only; not technical clearance.
          </p>
        </div>
      </details>
    </li>
  );
}
