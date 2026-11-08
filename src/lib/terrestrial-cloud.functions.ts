import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { terrestrialUploadSchema } from "./terrestrial-upload";

export const terrestrialCloud = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        token: z.string().regex(/^[a-f0-9]{64}$/),
        action: z.enum(["list", "save", "transfer", "delete", "review"]),
        sha256: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
        entry: z
          .object({ raw: z.string().max(2 * 1024 * 1024), filename: z.string().min(1).max(255) })
          .optional(),
        noticeId: z.string().uuid().optional(),
        state: z.enum(["unreviewed", "in-review", "completed"]).optional(),
        viewed: z.boolean().optional(),
      })
      .strict()
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { publicationAccess } = await import("./publication-cloud.server");
    const { loadTerrestrialUploads } = await import("./terrestrial-cloud.server");
    const access = await publicationAccess(getRequest(), data.token);
    if (data.action === "save") {
      if (!data.entry) throw new Error("Upload file missing.");
      const artifact = terrestrialUploadSchema.parse(JSON.parse(data.entry.raw));
      const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.entry.raw));
      const sha256 = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join(
        "",
      );
      const { error } = await access.db.from("terrestrial_publications").insert({
        owner_scope: access.scope,
        user_id: access.userId,
        issue: artifact.issue,
        sha256,
        filename: data.entry.filename,
        raw: data.entry.raw,
        artifact: JSON.parse(JSON.stringify(artifact)),
      });
      if (error)
        throw new Error(
          error.code === "23505" ? "This Terrestrial issue is already uploaded." : error.message,
        );
    } else if (data.action === "delete" || data.action === "transfer") {
      if (!data.sha256) throw new Error("Publication identifier missing.");
      const query =
        data.action === "delete"
          ? access.db.from("terrestrial_publications").delete()
          : access.db.from("terrestrial_publications").update({ transferred: true });
      const { error } = await query.eq("owner_scope", access.scope).eq("sha256", data.sha256);
      if (error) throw new Error(error.message);
    } else if (data.action === "review") {
      if (!data.noticeId || !data.state) throw new Error("Review target missing.");
      const { error } = await access.db
        .from("terrestrial_uploaded_notices")
        .update({
          state: data.state,
          updated_at: new Date().toISOString(),
          ...(data.viewed ? { viewed_at: new Date().toISOString() } : {}),
        })
        .eq("owner_scope", access.scope)
        .eq("id", data.noticeId);
      if (error) throw new Error(error.message);
    }
    return JSON.stringify(await loadTerrestrialUploads(access));
  });
