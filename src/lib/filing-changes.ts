import { z } from "zod";

const displayValue = z.unknown().transform((value): string | number | boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
});

export const filingChangesSchema = z.object({
  version: z.literal(1),
  status: z.enum(["no-baseline", "ambiguous", "changed", "unchanged"]),
  matchBasis: z.string(),
  scope: z.string(),
  baseline: z.object({ issue: z.number(), filingId: z.string(), sha256: z.string() }).nullable(),
  fields: z.array(z.object({ path: z.string(), before: displayValue, after: displayValue,
    beforePresent: z.boolean(), afterPresent: z.boolean() })),
});
export type FilingChanges = z.infer<typeof filingChangesSchema> & { artifactJson: string };
/** Only a newer filing with one confirmed candidate baseline gets the changes branch. */
export function hasEarlierFilingMatch(changes: FilingChanges | undefined, currentIssue: number): changes is FilingChanges {
  return !!changes && (changes.status === "changed" || changes.status === "unchanged") &&
    changes.baseline !== null && changes.baseline.issue < currentIssue;
}
export function parseFilingChanges(input: unknown): FilingChanges | undefined {
  const parsed = filingChangesSchema.safeParse(input);
  if (!parsed.success) return undefined;
  // Preserve the database artifact for export even when compound values need display serialization.
  const original = typeof input === "object" && input !== null && "artifactJson" in input && typeof input.artifactJson === "string"
    ? input.artifactJson : JSON.stringify(input, null, 2);
  return { ...parsed.data, artifactJson: original };
}
export function changeValue(value: unknown, present: boolean) {
  return present ? (typeof value === "string" ? value : JSON.stringify(value)) : "Not supplied";
}