import data from "@/data/ific3074-notice-records.json";
import pfdData from "@/data/ific3074-pfd-screening.json";

export type NoticeRecord = (typeof data.records)[number];
type PfdResults = Record<
  string,
  {
    status: string;
    reason: string | null;
    worstMarginDb?: number | null;
    groupsCalculated?: number;
    groups: PfdGroup[];
  }
>;
export type PfdGroup = {
  groupId: string;
  beam: string;
  freqLowMHz: number;
  freqHighMHz: number;
  limitId: string;
  citation: string;
  service: string;
  footnoteCheck?: string | null;
  referenceBandwidthHz: number;
  inputs: { psdMaxDbwHz: number; gainMaxDbi: number; satelliteLongitudeDeg: number };
  worstPoint: {
    point: { lat: number; lon: number; label: string };
    arrivalAngleDeg: number;
    slantRangeKm: number;
    spreadingLossDb: number;
    pfdDb: number;
    limitDb: number;
    marginDb: number;
  };
};
export type Station = {
  class: string;
  rxMHz: number;
  lowMHz: number;
  highMHz: number;
  lat: number | null;
  lon: number | null;
  excelRow: number;
};

export const pfdMeta = pfdData;
export const pfdOf = (r: NoticeRecord) =>
  (pfdData.results as unknown as PfdResults)[r.noticeId] ?? {
    status: "not-calculable",
    reason: "No result",
    groups: [],
  };
export const stationOf = (id: string) =>
  (pfdData.finnishStations as unknown as Record<string, Station>)[id];

export const ghz = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(3).replace(/\.?0+$/, "")} GHz` : `${m} MHz`;
export const refBw = (hz: number) => (hz >= 1e6 ? `${hz / 1e6} MHz` : `${hz / 1000} kHz`);

export const pfdLabel: Record<string, string> = {
  exceeds: "Above stored limit",
  "near-limit": "Inside review buffer",
  within: "Below stored limit",
  "not-calculable": "Unresolved / not calculated",
};

/** Plain-language review reasons derived from recorded features and the offline PFD screening. */
export function reviewReasons(r: NoticeRecord): string[] {
  const f = r.features;
  const p = pfdOf(r);
  const g = p.groups[0];
  const out = [
    `Frequencies ${ghz(r.frequencyLowMHz)}–${ghz(r.frequencyHighMHz)} overlap ${f.finnishStations} Finnish receiving station(s) in Traficom's national list — some may not be notified to the ITU, so the ITU may not have flagged this.`,
  ];
  if (g && p.status === "exceeds")
    out.push(
      `Stored sample maximum: ${g.worstPoint.pfdDb.toFixed(1)} dB(W/m²) per ${refBw(g.referenceBandwidthHz)}, ${g.worstPoint.marginDb.toFixed(1)} dB above the encoded ${g.citation} limit. Confirm applicability and assumptions; this is not a compliance verdict.`,
    );
  else if (g && p.status === "near-limit")
    out.push(
      `Stored sample maximum is ${Math.abs(g.worstPoint.marginDb).toFixed(1)} dB below the encoded limit, inside the team-chosen 3 dB review buffer (not a legal limit).`,
    );
  else if (g)
    out.push(
      `Stored sample maximum is ${Math.abs(g.worstPoint.marginDb).toFixed(1)} dB below the encoded limit. Sample maxima are not continuous Finnish maxima or clearance.`,
    );
  else out.push(`PFD not calculated: ${p.reason ?? "inputs missing"}.`);
  if (f.newThisIssue)
    out.push(
      `Publication metadata flags new groups in ${r.publication}; verify the applicable procedure and dates before assigning a deadline.`,
    );
  return out;
}

/** Short administration-to-administration letter, as described by Traficom: facts only, no attachments. */
export function buildLetter(r: NoticeRecord, date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  const p = pfdOf(r);
  const over = p.groups.filter((g) => g.worstPoint.marginDb > 0);
  const bands = [
    ...new Set(
      (over.length ? over : p.groups).map((g) => `${ghz(g.freqLowMHz)}–${ghz(g.freqHighMHz)}`),
    ),
  ];
  const stations = r.finnishStations.map(stationOf).filter(Boolean) as Station[];
  const classes = [...new Set(stations.map((s) => s.class))].join(", ");
  const finding = over.length
    ? over
        .slice(0, 3)
        .map(
          (g) =>
            `   - ${ghz(g.freqLowMHz)}–${ghz(g.freqHighMHz)} (group ${g.groupId}): calculated PFD ${g.worstPoint.pfdDb.toFixed(1)} dB(W/m²) in ${refBw(g.referenceBandwidthHz)} at arrival angle ${g.worstPoint.arrivalAngleDeg.toFixed(1)}°, exceeding the limit of ${g.worstPoint.limitDb.toFixed(1)} dB(W/m²) in ${g.citation.split(" (")[0]} by ${g.worstPoint.marginDb.toFixed(1)} dB.`,
        )
        .join("\n")
    : `   - The frequency band(s) ${ghz(r.frequencyLowMHz)}–${ghz(r.frequencyHighMHz)} are used in Finland by ${stations.length} receiving station(s) (licence classes ${classes || "n/a"}).`;
  return `Diary number: [to be added by Traficom registry]
Date: ${d}

To: Administration of ${r.administration}
Copy: ITU Radiocommunication Bureau

Subject: Comments of the Administration of Finland on the satellite network ${r.network} (BR IFIC ${data.issue}, notice ID ${r.noticeId})

Dear Sir/Madam,

The Administration of Finland has examined the satellite network ${r.network}, published by the Radiocommunication Bureau in BR IFIC ${data.issue} under No. ${r.reference.provision} of the Radio Regulations.

Finland is concerned about the following frequency band(s): ${bands.join(", ") || `${ghz(r.frequencyLowMHz)}–${ghz(r.frequencyHighMHz)}`}. These bands are used in Finland by ${stations.length} receiving station(s) (licence classes ${classes || "n/a"}).

According to our calculations:
${finding}

Finland therefore does not agree to the assignments of ${r.network} in the above band(s) and requests that the Administration of ${r.administration} ensures that Finnish services are protected.

Yours faithfully,

[Name]
[Title]
Finnish Transport and Communications Agency Traficom`;
}
