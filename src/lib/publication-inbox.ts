import { z } from "zod";

const num = z.number().finite();
/** Offline-computed PFD screening supplied with the upload; displayed as stored, never recomputed. */
export const storedScreeningSchema = z
  .object({
    status: z.enum(["exceeds", "near-limit", "within", "not-calculable"]),
    worstMarginDb: num.optional(),
    reason: z.string().max(2000).optional(),
    method: z.string().max(2000).optional(),
    groups: z
      .array(
        z
          .object({
            groupId: z.string().min(1).max(100),
            beam: z.string().max(100).optional(),
            freqLowMHz: num,
            freqHighMHz: num,
            citation: z.string().min(1).max(500),
            service: z.string().max(300).optional(),
            referenceBandwidthHz: num.positive(),
            inputs: z.object({
              psdMaxDbwHz: num,
              gainMaxDbi: num,
              satelliteLongitudeDeg: num.optional(),
            }),
            worstPoint: z.object({
              label: z.string().min(1).max(200),
              lat: num,
              lon: num,
              arrivalAngleDeg: num,
              slantRangeKm: num,
              spreadingLossDb: num,
              pfdDb: num,
              limitDb: num,
              marginDb: num,
            }),
          })
          .strict(),
      )
      .max(50)
      .default([]),
  })
  .strict();
export type StoredScreening = z.infer<typeof storedScreeningSchema>;

const filingSchema = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    administration: z.string().min(1).max(10),
    lowerMHz: z.number().finite().nonnegative(),
    upperMHz: z.number().finite().positive(),
    orbit: z.enum(["GSO", "Non-GSO", "Unknown"]),
    visibility: z.string().min(1).max(2000),
    reviewTrigger: z.string().min(1).max(2000),
    blockers: z.array(z.string().min(1).max(2000)).max(30),
    pfdScreening: storedScreeningSchema.optional(),
  })
  .strict()
  .refine((r) => r.upperMHz > r.lowerMHz, "Frequency bounds must increase.");
const publicationSchema = z
  .object({
    schemaVersion: z.literal("antara-publication-demo-v1"),
    synthetic: z.literal(true),
    issue: z.number().int().min(3075),
    publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    filings: z.array(filingSchema).min(1).max(500),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (new Set(p.filings.map((f) => f.id)).size !== p.filings.length)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duplicate filing IDs in publication.",
      });
  });
export type DemoPublication = z.infer<typeof publicationSchema>;
const circularSchema = z
  .object({
    schemaVersion: z.literal("antara-publication-demo-v1").optional(),
    synthetic: z.literal(true).optional(),
    publication: z
      .object({
        ific_no: z.number().int().min(3075),
        publication_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        service: z.literal("Space Services"),
        total_notices: z.number().int().min(1).max(500),
        status: z.literal("published"),
      })
      .strict(),
    notices: z.array(filingSchema).min(1).max(500),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.publication.total_notices !== p.notices.length)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publication", "total_notices"],
        message: "total_notices must match the number of notices.",
      });
  })
  .transform((p) =>
    publicationSchema.parse({
      schemaVersion: "antara-publication-demo-v1",
      synthetic: true,
      issue: p.publication.ific_no,
      publishedAt: p.publication.publication_date,
      filings: p.notices,
    }),
  );
export type InboxEntry = {
  publication: DemoPublication;
  raw: string;
  filename: string;
  sha256: string;
  uploadedAt: string;
  transferred: boolean;
  /** ISO time the publication entered the Space desk (scan time). */
  transferredAt?: string;
};
export const inboxKey = "antara:publication-inbox:v1";
export const inboxEvent = "antara:publication-inbox-change";
export function parsePublication(input: unknown) {
  if (typeof input === "object" && input !== null && "publication" in input)
    return circularSchema.parse(input);
  return publicationSchema.parse(input);
}
export function readInbox(storage: Pick<Storage, "getItem">): InboxEntry[] {
  try {
    const rows = JSON.parse(storage.getItem(inboxKey) ?? "[]");
    if (!Array.isArray(rows)) return [];
    return rows.filter(
      (r): r is InboxEntry =>
        typeof r.raw === "string" &&
        typeof r.sha256 === "string" &&
        typeof r.filename === "string" &&
        typeof r.uploadedAt === "string" &&
        typeof r.transferred === "boolean" &&
        publicationSchema.safeParse(r.publication).success,
    );
  } catch {
    return [];
  }
}
export function addPublication(entries: InboxEntry[], entry: InboxEntry) {
  if (
    entries.some(
      (e) => e.sha256 === entry.sha256 || e.publication.issue === entry.publication.issue,
    )
  )
    throw new Error(
      "This publication is already in the inbox. Use a new issue number for another release.",
    );
  return [...entries, entry];
}
export function removePublication(entries: InboxEntry[], sha256: string) {
  return entries.filter((e) => e.sha256 !== sha256);
}
/** Drops filings with no stored PFD result; files left with no filings are removed entirely. */
export function removeUnscreenedFilings(entries: InboxEntry[]) {
  return entries
    .map((e) => ({
      ...e,
      publication: {
        ...e.publication,
        filings: e.publication.filings.filter(
          (f) => f.pfdScreening && f.pfdScreening.status !== "not-calculable",
        ),
      },
    }))
    .filter((e) => e.publication.filings.length > 0);
}
export function writeInbox(entries: InboxEntry[]) {
  localStorage.setItem(inboxKey, JSON.stringify(entries));
  window.dispatchEvent(new Event(inboxEvent));
}
export const publicationTemplate: z.input<typeof circularSchema> = {
  schemaVersion: "antara-publication-demo-v1",
  synthetic: true,
  publication: {
    ific_no: 3077,
    publication_date: "2026-11-07",
    service: "Space Services",
    total_notices: 2,
    status: "published",
  },
  notices: [
    {
      id: "SIM-3077-001",
      name: "AURORA DEMO",
      administration: "D",
      lowerMHz: 10700,
      upperMHz: 11700,
      orbit: "GSO",
      visibility: "Not established; supplied orbit/coverage requires expert verification.",
      reviewTrigger:
        "Downlink reception-band relevance needs checking; no stored PFD calculation supplied.",
      blockers: ["Power spectral density missing", "Coverage and applicable provision unverified"],
    },
    {
      id: "SIM-3077-002",
      name: "POLAR DEMO",
      administration: "NOR",
      lowerMHz: 3400,
      upperMHz: 4200,
      orbit: "Non-GSO",
      visibility: "Time-dependent coverage unavailable.",
      reviewTrigger: "Non-GSO time-dependent reception evidence missing.",
      blockers: ["Orbital time series unavailable", "Applicable protection criterion unconfirmed"],
    },
  ],
};
