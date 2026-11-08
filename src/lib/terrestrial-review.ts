import { z } from "zod";
import tierSettings from "@/data/terrestrial-review-tiers.json";
import { terrestrialExpertLetterNotes } from "@/lib/terrestrial-expert-checks";
import { p1546AssessmentSchema, canonicalEvidence } from "./p1546-assessment";
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(jsonValue),
  ]),
);

export type GeographicTier = "high" | "medium" | "low" | "unclassified";
export function terrestrialTier(administration: string): { tier: GeographicTier; reason: string } {
  const setting = (
    tierSettings.administrations as Record<string, { tier: string; reason: string }>
  )[administration];
  if (setting && (setting.tier === "high" || setting.tier === "medium" || setting.tier === "low"))
    return { tier: setting.tier, reason: setting.reason };
  return {
    tier: "unclassified",
    reason: "No team review tier assigned; geographic relevance remains unresolved.",
  };
}
export const tierStyle: Record<GeographicTier, string> = {
  high: "text-destructive border-destructive/50 bg-destructive/10",
  medium: "text-chart-1 border-chart-1/50 bg-chart-1/10",
  low: "text-chart-2 border-chart-2/50 bg-chart-2/10",
  unclassified: "text-muted-foreground border-border bg-muted",
};
export const unresolvedTerrestrialReason =
  "No direct match in the available Finnish Excel intervals. Adjacent-band, national-register and Finnish border / territorial-sea relevance still require review; absence of overlap is not clearance.";

const sourceSchema = z
  .object({ file: z.string(), table: z.string(), csvRow: z.number() })
  .passthrough();
const noticeRawSchema = z
  .object({
    terrakey: z.string(),
    adm: z.string(),
    assgn_id: z.string(),
    stn_id: z.string(),
    freq_min: z.string(),
    freq_max: z.string(),
    freq_assgn: z.string(),
    stn_cls: z.string(),
    stn_type: z.string(),
    emi_cls: z.string(),
    bdwdth_cde: z.string(),
    prov: z.string(),
    intent: z.string(),
  })
  .catchall(jsonValue);
const geoRawSchema = z.object({ site_name: z.string().optional() }).catchall(jsonValue);
const antennaRawSchema = z
  .object({
    pwr_dbw: z.string().optional(),
    pwr_eiv: z.string().optional(),
    hgt_agl: z.string().optional(),
    eff_hgtmax: z.string().optional(),
    azm_max_e: z.string().optional(),
    gain_max: z.string().optional(),
  })
  .catchall(jsonValue);
export const rowSchema = z
  .object({
    notice: z.object({ source: sourceSchema, raw: noticeRawSchema }).passthrough(),
    screenStatus: z.string(),
    matchedFinnishRows: z.array(
      z
        .object({
          station: z.string(),
          source: z.object({ file: z.string(), sheet: z.string(), row: z.number() }).passthrough(),
          protectedFrequencyBasis: z.string(),
          lowerMHz: z.number(),
          upperMHz: z.number(),
        })
        .passthrough(),
    ),
    transmitterLocations: z.array(
      z
        .object({
          origin: z.string(),
          geoKey: z.string(),
          reportedPoint: z
            .object({ latitudeDeg: z.number(), longitudeDeg: z.number() })
            .passthrough()
            .nullable(),
          geoEvidence: z.array(
            z.object({ table: z.string(), csvRow: z.number(), raw: geoRawSchema }).passthrough(),
          ),
          antennaEvidence: z.array(
            z
              .object({ table: z.string(), csvRow: z.number(), raw: antennaRawSchema })
              .passthrough(),
          ),
        })
        .passthrough(),
    ),
    blockers: z.array(z.string()),
    p1546: p1546AssessmentSchema.optional(),
  })
  .passthrough()
  .superRefine((row, context) => {
    if (!row.p1546) return;
    const { p1546, ...sourceRecord } = row;
    if (
      p1546.noticeId !== row.notice.raw.terrakey ||
      canonicalEvidence(p1546.sourceRecord) !== canonicalEvidence(sourceRecord)
    )
      context.addIssue({
        code: "custom",
        message:
          "P.1546 artifact does not match the complete current source record; prepare a new offline assessment.",
      });
  });

export const terrestrialArtifactSchema = z
  .object({ issue: z.literal(3076), scope: z.string(), records: z.array(rowSchema) })
  .passthrough();
export type TerrestrialRow = z.infer<typeof rowSchema>;
export type TerrestrialArtifact = z.infer<typeof terrestrialArtifactSchema>;
export type ReviewState = "unreviewed" | "in-review" | "completed";
export type TerrestrialReviews = Record<
  string,
  { state: ReviewState; updatedAt: string; viewedAt?: string | undefined }
>;
export const terrestrialReviewKey = "antara:terrestrial:3076:reviews:v1";
export const terrestrialReviewEvent = "antara:terrestrial-reviews-change";
export const terrestrialFilterKey = "antara:terrestrial:3076:filters:v1";
export type TerrestrialFilters = {
  query: string;
  administration: string;
  relevance: string;
  workflow: string;
  tier: string;
  page: number;
};
export const defaultTerrestrialFilters: TerrestrialFilters = {
  query: "",
  administration: "all",
  relevance: "overlap",
  workflow: "all",
  tier: "all",
  page: 0,
};

export function readTerrestrialReviews(storage: Pick<Storage, "getItem">): TerrestrialReviews {
  try {
    const value = z
      .object({
        version: z.literal(1),
        reviews: z.record(
          z.object({
            state: z.enum(["unreviewed", "in-review", "completed"]),
            updatedAt: z.string(),
            viewedAt: z.string().optional(),
          }),
        ),
      })
      .parse(JSON.parse(storage.getItem(terrestrialReviewKey) ?? "null"));
    return value.reviews;
  } catch {
    return {};
  }
}

export function readTerrestrialFilters(storage: Pick<Storage, "getItem">): TerrestrialFilters {
  try {
    return z
      .object({
        query: z.string(),
        administration: z.string(),
        relevance: z.enum(["overlap", "no-overlap", "all"]),
        workflow: z.enum(["all", "outstanding", "unreviewed", "in-review", "completed"]),
        tier: z.enum(["all", "high", "medium", "low", "unclassified"]).default("all"),
        page: z.number().int().nonnegative(),
      })
      .parse(JSON.parse(storage.getItem(terrestrialFilterKey) ?? "null"));
  } catch {
    return { ...defaultTerrestrialFilters };
  }
}

export const stateOf = (row: TerrestrialRow, reviews: TerrestrialReviews): ReviewState =>
  reviews[row.notice.raw.terrakey]?.state ?? "unreviewed";
export const hasOverlap = (row: TerrestrialRow) => row.matchedFinnishRows.length > 0;
export const siteName = (row: TerrestrialRow) =>
  row.transmitterLocations
    .flatMap((l) => l.geoEvidence.map((g) => g.raw.site_name))
    .filter(Boolean)
    .join(", ") ||
  row.notice.raw.stn_id ||
  row.notice.raw.assgn_id ||
  row.notice.raw.terrakey;
export const intervalLabel = (row: TerrestrialRow) =>
  `${row.notice.raw.freq_min || "?"}–${row.notice.raw.freq_max || "?"} MHz`;

export function matchesTerrestrialSearch(row: TerrestrialRow, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const mhz = text.match(/^(\d+(?:[.,]\d+)?)\s*(mhz)?$/);
  if (mhz?.[1]) {
    const n = Number(mhz[1].replace(",", "."));
    const { freq_min: low, freq_max: high, freq_assgn: assigned } = row.notice.raw;
    if (
      (low?.trim() && high?.trim() && Number(low) <= n && n <= Number(high)) ||
      (assigned?.trim() && Number(assigned) === n)
    )
      return true;
  }
  return `${siteName(row)} ${row.notice.raw.terrakey} ${row.notice.raw.assgn_id} ${row.notice.raw.adm} ${intervalLabel(row)} ${row.notice.raw.freq_assgn}`
    .toLowerCase()
    .includes(text);
}

export function filterTerrestrial(
  rows: TerrestrialRow[],
  reviews: TerrestrialReviews,
  filters: TerrestrialFilters,
) {
  const order: Record<GeographicTier, number> = { high: 0, medium: 1, low: 2, unclassified: 3 };
  return rows
    .filter(
      (row) =>
        (filters.administration === "all" || row.notice.raw.adm === filters.administration) &&
        (filters.relevance === "all" ||
          (filters.relevance === "overlap" ? hasOverlap(row) : !hasOverlap(row))) &&
        (filters.workflow === "all" ||
          (filters.workflow === "outstanding"
            ? stateOf(row, reviews) !== "completed"
            : stateOf(row, reviews) === filters.workflow)) &&
        (filters.tier === "all" || terrestrialTier(row.notice.raw.adm).tier === filters.tier) &&
        matchesTerrestrialSearch(row, filters.query),
    )
    .sort(
      (a, b) =>
        order[terrestrialTier(a.notice.raw.adm).tier] -
        order[terrestrialTier(b.notice.raw.adm).tier],
    );
}

export type TerrestrialMetric = "overlap" | "unresolved" | "inReview" | "reviewed";
export function terrestrialMetricFilters(metric: TerrestrialMetric): TerrestrialFilters {
  return {
    ...defaultTerrestrialFilters,
    relevance: metric === "overlap" ? "overlap" : metric === "unresolved" ? "no-overlap" : "all",
    workflow:
      metric === "inReview" ? "in-review" : metric === "reviewed" ? "completed" : "outstanding",
  };
}
export function activeTerrestrialMetric(filters: TerrestrialFilters): TerrestrialMetric | null {
  if (filters.query || filters.administration !== "all" || filters.tier !== "all") return null;
  if (filters.workflow === "outstanding" && filters.relevance === "overlap") return "overlap";
  if (filters.workflow === "outstanding" && filters.relevance === "no-overlap") return "unresolved";
  if (filters.relevance === "all" && filters.workflow === "in-review") return "inReview";
  if (filters.relevance === "all" && filters.workflow === "completed") return "reviewed";
  return null;
}

export function terrestrialWorkload(rows: TerrestrialRow[], reviews: TerrestrialReviews) {
  const outstanding = rows.filter((r) => stateOf(r, reviews) !== "completed");
  return {
    overlap: outstanding.filter(hasOverlap).length,
    unresolved: outstanding.filter((r) => !hasOverlap(r)).length,
    inReview: outstanding.filter((r) => stateOf(r, reviews) === "in-review").length,
    reviewed: rows.length - outstanding.length,
  };
}

/** Deterministic selected-evidence request, not an objection or confirmed interference finding. */
export function terrestrialLetter(
  row: TerrestrialRow,
  date = new Date(),
  issue = 3076,
  synthetic = false,
): string {
  const raw = row.notice.raw;
  const stations = row.matchedFinnishRows
    .map(
      (r) =>
        `- Station ${r.station}: ${r.lowerMHz}–${r.upperMHz} MHz (${r.protectedFrequencyBasis}); ${r.source.file}, sheet ${r.source.sheet}, row ${r.source.row}`,
    )
    .join("\n");
  return `Diary number: [to be added by Traficom registry]
Date: ${date.toISOString().slice(0, 10)}

To: Administration of ${raw.adm}

Subject: Request for technical clarification and bilateral coordination — BR IFIC ${issue}, notice ${raw.terrakey}

Dear Sir/Madam,

${synthetic ? "Synthetic demonstration — supplied evidence is unverified.\n\n" : ""}The Administration of Finland is reviewing the terrestrial notice ${raw.terrakey}, assignment ${raw.assgn_id || "not reported"}, site ${siteName(row)}, published in BR IFIC ${issue}. The reported provision is ${raw.prov || "not reported"}; its applicability remains to be confirmed.

The reported frequency interval is ${intervalLabel(row)}. ${hasOverlap(row) ? "The offline frequency screening identified overlap with the following Finnish reception intervals:" : "No direct overlap was identified in the available Finnish Excel intervals. National, adjacent-band and geographic relevance remains unresolved."}
${stations}

Source: ${row.notice.source.file}, table ${row.notice.source.table}, CSV row ${row.notice.source.csvRow}.

Frequency overlap alone does not establish harmful interference. Actual-path ITU-R P.1546 field strength at the Finnish border or territorial sea and an applicable coordination comparison have not been established. This letter makes no safety or regulatory-compliance finding.
${row.p1546 ? `\nStored offline P.1546 evidence: ${row.p1546.scope}\n${row.p1546.paths.map((p) => `- ${p.target}: ${p.fieldStrengthDbUvPerM === null ? "unresolved" : `${p.fieldStrengthDbUvPerM} dBµV/m (conditional)`}; ${p.comparison.reason}`).join("\n")}\nSource manifest SHA-256: ${row.p1546.provenance.manifestSha256}. Supplied inputs and model execution are not authenticated by upload.\n` : ""}

${terrestrialExpertLetterNotes(row)}

Please confirm the transmitter location and geographic datum, radiated power and spectrum, antenna pattern and azimuth-dependent effective heights, and the applicable coordination procedure. Finland requests bilateral technical clarification before determining whether protective measures are necessary.

Yours faithfully,
[Name]
[Title]
Finnish Transport and Communications Agency Traficom

Draft — expert review and approval required; not sent.`;
}
