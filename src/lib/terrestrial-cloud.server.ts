import type { publicationAccess } from "./publication-cloud.server";
import { terrestrialUploadSchema, type TerrestrialUploadEntry } from "./terrestrial-upload";
import { parseFilingChanges } from "./filing-changes";
type Access = Awaited<ReturnType<typeof publicationAccess>>;
export async function loadTerrestrialUploads(access: Access): Promise<TerrestrialUploadEntry[]> {
  const notices: {
    publication_id: string;
    id: string;
    notice_id: string;
    state: string;
    viewed_at: string | null;
    changes: unknown;
  }[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await access.db
      .from("terrestrial_uploaded_notices")
      .select("publication_id,id,notice_id,state,viewed_at,changes")
      .eq("owner_scope", access.scope)
      .order("id")
      .range(offset, offset + 99);
    if (error) throw new Error(error.message);
    notices.push(...(data ?? []));
    if (!data || data.length < 100) break;
  }
  const entries: TerrestrialUploadEntry[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await access.db
      .from("terrestrial_publications")
      .select("*")
      .eq("owner_scope", access.scope)
      .order("uploaded_at", { ascending: false })
      .order("id")
      .range(offset, offset + 99);
    if (error) throw new Error(error.message);
    for (const p of data ?? [])
      entries.push({
        id: p.id,
        artifact: terrestrialUploadSchema.parse(p.artifact),
        sha256: p.sha256,
        raw: p.raw,
        filename: p.filename,
        uploadedAt: p.uploaded_at,
        transferred: p.transferred,
        notices: notices
          .filter((n) => n.publication_id === p.id)
          .map((n) => ({
            id: n.id,
            noticeId: n.notice_id,
            state:
              n.state === "completed"
                ? "completed"
                : n.state === "in-review"
                  ? "in-review"
                  : "unreviewed",
            ...(n.viewed_at ? { viewedAt: n.viewed_at } : {}),
            changes: parseFilingChanges(n.changes),
          })),
      });
    if (!data || data.length < 100) break;
  }
  return entries;
}
export async function queryTerrestrialUploads(
  access: Access,
  filter: {
    issues: number[];
    administration: string | null;
    noticeId: string | null;
    offset: number;
  },
) {
  const entries = await loadTerrestrialUploads(access);
  const rows = entries
    .filter((e) => !filter.issues.length || filter.issues.includes(e.artifact.issue))
    .flatMap((e) =>
      e.artifact.records.map((row) => ({
        issue: e.artifact.issue,
        sha256: e.sha256,
        filename: e.filename,
        synthetic: e.artifact.synthetic,
        scope: e.artifact.scope,
        record: row,
        changes: e.notices.find((n) => n.noticeId === row.notice.raw.terrakey)?.changes ?? null,
      })),
    )
    .filter(
      (r) =>
        (!filter.administration ||
          r.record.notice.raw.adm.trim().toUpperCase() ===
            filter.administration.trim().toUpperCase()) &&
        (!filter.noticeId || r.record.notice.raw.terrakey === filter.noticeId),
    );
  return {
    total: rows.length,
    nextOffset: filter.offset + 5 < rows.length ? filter.offset + 5 : null,
    records: rows.slice(filter.offset, filter.offset + 5),
    scope:
      "Fresh scoped Cloud terrestrial uploads. Supplied offline evidence unchanged; no runtime propagation or clearance. Upload-sequence Changes are not confirmed notification actions.",
  };
}
