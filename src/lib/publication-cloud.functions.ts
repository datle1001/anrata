import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { parsePublication } from "./publication-inbox";
import { uploadedFilingEvidence } from "./upload-evidence";

export const cloudPublications = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/),
    action: z.enum(["list", "save", "delete"]), sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
    entry: z.object({ raw: z.string().max(2 * 1024 * 1024), filename: z.string().min(1).max(255),
      publication: z.unknown(), transferred: z.boolean(), transferredAt: z.string().datetime().optional() }).optional(),
  }).strict().parse(input))
  .handler(async ({ data }) => {
    const { publicationAccess, loadCloudPublications } = await import("./publication-cloud.server");
    const access = await publicationAccess(getRequest(), data.token);
    if (data.action === "save") {
      if (!data.entry) throw new Error("Publication file missing.");
      const original = parsePublication(JSON.parse(data.entry.raw));
      const publication = parsePublication(data.entry.publication);
      if (original.issue !== publication.issue || original.publishedAt !== publication.publishedAt ||
          publication.filings.some((f) => !original.filings.some((source) => JSON.stringify(source) === JSON.stringify(f))))
        throw new Error("Stored rows must retain the original uploaded evidence.");
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.entry.raw));
      const sha256 = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
      const evidenceEntry = { raw: data.entry.raw, filename: data.entry.filename,
        transferred: data.entry.transferred, publication, sha256, uploadedAt: new Date().toISOString(),
        ...(data.entry.transferredAt ? { transferredAt: data.entry.transferredAt } : {}) };
      const filingEvidence = Object.fromEntries(publication.filings.map((filing) =>
        [filing.id, uploadedFilingEvidence(evidenceEntry, filing)]));
      const { error } = await access.db.from("uploaded_publications").upsert({
        owner_scope: access.scope, user_id: access.userId, issue: publication.issue, sha256,
        raw: data.entry.raw, filename: data.entry.filename, publication,
        filing_evidence: filingEvidence,
        transferred: data.entry.transferred, transferred_at: data.entry.transferredAt ?? null,
      }, { onConflict: "owner_scope,sha256" });
      if (error) throw new Error(error.message);
    } else if (data.action === "delete") {
      if (!data.sha256) throw new Error("Publication identifier missing.");
      const { error } = await access.db.from("uploaded_publications").delete().eq("owner_scope", access.scope).eq("sha256", data.sha256);
      if (error) throw new Error(error.message);
    }
    return loadCloudPublications(access);
  });