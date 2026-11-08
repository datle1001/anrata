import { z } from "zod";
import { rowSchema, terrestrialTier } from "./terrestrial-review";
import type { FilingChanges } from "./filing-changes";

export const terrestrialUploadSchema = z
  .object({
    schemaVersion: z.literal("antara-terrestrial-review-v1"),
    service: z.literal("Terrestrial Services"),
    synthetic: z.boolean(),
    issue: z.number().int().positive(),
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scope: z.string().min(1),
    totalNotices: z.number().int().min(1).max(500),
    records: z.array(rowSchema).min(1).max(500),
  })
  .passthrough()
  .superRefine((p, ctx) => {
    if (p.totalNotices !== p.records.length)
      ctx.addIssue({ code: "custom", message: "totalNotices must equal records.length." });
    if (new Set(p.records.map((r) => r.notice.raw.terrakey)).size !== p.records.length)
      ctx.addIssue({ code: "custom", message: "Duplicate terrakey in publication." });
    for (const row of p.records) {
      if (!["FB", "ML"].includes(row.notice.raw.stn_cls))
        ctx.addIssue({
          code: "custom",
          message: "This side quest accepts land-mobile FB / ML notices only.",
        });
      if (!row.notice.raw.terrakey.trim() || !row.notice.raw.adm.trim())
        ctx.addIssue({
          code: "custom",
          message: "Notice identity and administration are required.",
        });
    }
  });
export type TerrestrialUpload = z.infer<typeof terrestrialUploadSchema>;
export type TerrestrialUploadEntry = {
  id: string;
  artifact: TerrestrialUpload;
  sha256: string;
  raw: string;
  filename: string;
  uploadedAt: string;
  transferred: boolean;
  notices: {
    id: string;
    noticeId: string;
    state: "unreviewed" | "in-review" | "completed";
    viewedAt?: string;
    changes?: FilingChanges | undefined;
  }[];
};
export const terrestrialInboxEvent = "antara:terrestrial-upload-change";
export const terrestrialTemplate: TerrestrialUpload = {
  schemaVersion: "antara-terrestrial-review-v1",
  service: "Terrestrial Services",
  synthetic: true,
  issue: 3077,
  publishedAt: "2026-11-08",
  totalNotices: 1,
  scope: "Synthetic offline review example. No propagation or regulatory comparison calculated.",
  records: [
    {
      notice: {
        source: { file: "synthetic-terrestrial-3077.json", table: "fxm_terra", csvRow: 1 },
        raw: {
          terrakey: "SIM-T-001",
          adm: "RUS",
          assgn_id: "SIM-ASSIGN-001",
          stn_id: "Northern mobile test",
          freq_min: "150",
          freq_max: "151",
          freq_assgn: "150.5",
          stn_cls: "FB",
          stn_type: "TX",
          emi_cls: "F3E",
          bdwdth_cde: "12K5",
          prov: "",
          intent: "ADD",
        },
      },
      screenStatus: "National relevance unresolved",
      matchedFinnishRows: [],
      transmitterLocations: [],
      blockers: [
        "Transmitter location and validated ERP missing",
        "Applicable coordination criterion unconfirmed",
        "Actual-path P.1546 unavailable",
      ],
    },
  ],
};
export function terrestrialUploadRows(entries: TerrestrialUploadEntry[]) {
  const rank = { high: 0, medium: 1, low: 2, unclassified: 3 };
  return [...entries]
    .filter((e) => e.transferred)
    .sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt))
    .flatMap((entry) =>
      [...entry.artifact.records]
        .sort(
          (a, b) =>
            rank[terrestrialTier(a.notice.raw.adm).tier] -
            rank[terrestrialTier(b.notice.raw.adm).tier],
        )
        .map((row) => ({
          entry,
          row,
          review: entry.notices.find((n) => n.noticeId === row.notice.raw.terrakey),
        })),
    );
}
