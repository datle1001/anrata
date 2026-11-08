import { z } from "zod";

const finite = z.number().finite();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const p1546AssessmentSchema = z
  .object({
    schemaVersion: z.literal("antara-p1546-v1"),
    noticeId: z.string().min(1),
    scope: z.string().min(1),
    sourceRecord: z.record(z.unknown()),
    provenance: z
      .object({
        sourceSha256: hash,
        manifestSha256: hash,
        scriptSha256: hash,
        modelTreeSha256: hash,
        modelCommit: z.string().min(1),
        modelRepository: z.string().url(),
        validationScope: z.string().min(1),
      })
      .passthrough(),
    limitations: z.array(z.string()).min(1),
    paths: z
      .array(
        z
          .object({
            id: z.string().min(1),
            target: z.string().min(1),
            status: z.enum(["conditional", "unresolved"]),
            distanceKm: finite.positive().nullable(),
            fieldStrengthDbUvPerM: finite.nullable(),
            basicTransmissionLossDb: finite.nullable(),
            inputs: z.record(z.unknown()),
            assumptions: z.array(z.string()),
            blockers: z.array(z.string()),
            comparison: z
              .object({
                status: z.enum([
                  "conditional-above-trigger",
                  "conditional-at-or-below-trigger",
                  "unresolved",
                ]),
                thresholdDbUvPerM: finite.nullable(),
                marginDb: finite.nullable(),
                source: z.string().nullable(),
                reason: z.string(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .min(1)
      .max(500),
  })
  .passthrough()
  .superRefine((assessment, context) => {
    for (const path of assessment.paths) {
      if (
        path.status === "unresolved" &&
        (path.fieldStrengthDbUvPerM !== null || path.basicTransmissionLossDb !== null)
      )
        context.addIssue({
          code: "custom",
          message: "Unresolved paths cannot contain predictions.",
        });
      if (
        path.status === "conditional" &&
        (path.fieldStrengthDbUvPerM === null ||
          path.basicTransmissionLossDb === null ||
          path.distanceKm === null)
      )
        context.addIssue({
          code: "custom",
          message: "Calculated paths require finite field, loss and distance.",
        });
      if (path.comparison.status === "unresolved" && path.comparison.marginDb !== null)
        context.addIssue({
          code: "custom",
          message: "Unresolved comparison cannot contain a margin.",
        });
      if (path.comparison.status !== "unresolved") {
        const { thresholdDbUvPerM, marginDb, source, status } = path.comparison;
        if (
          path.status !== "conditional" ||
          thresholdDbUvPerM === null ||
          marginDb === null ||
          !source ||
          path.fieldStrengthDbUvPerM === null ||
          Math.abs(path.fieldStrengthDbUvPerM - thresholdDbUvPerM - marginDb) > 0.000001 ||
          marginDb > 0 !== (status === "conditional-above-trigger")
        )
          context.addIssue({
            code: "custom",
            message: "Comparison must match the stored field, threshold and margin.",
          });
      }
    }
  });
export type P1546Assessment = z.infer<typeof p1546AssessmentSchema>;

/** Structural equality only; this does not authenticate a model run or its inputs. */
export function canonicalEvidence(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalEvidence).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalEvidence(item)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
