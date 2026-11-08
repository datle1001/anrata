import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { parsePublication, type InboxEntry } from "./publication-inbox";

export async function publicationAccess(request: Request, token?: string) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Cloud upload storage is not configured.");
  const bearer = request.headers.get("authorization");
  if (bearer) {
    if (!bearer.startsWith("Bearer ")) throw new Error("Invalid upload session.");
    const db = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: bearer }, fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      } },
    });
    const { data, error } = await db.auth.getUser(bearer.slice(7));
    if (error || !data.user) throw new Error("Your upload session expired. Please sign in again.");
    return { db, scope: data.user.id, userId: data.user.id };
  }
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new Error("Upload access is unavailable. Reload Antara.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const scope = "guest:" + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  // A high-entropy guest capability authorizes only its hashed namespace; no public table access.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { db: supabaseAdmin, scope, userId: null };
}
export async function loadCloudPublications(access: Awaited<ReturnType<typeof publicationAccess>>) {
  const entries: InboxEntry[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await access.db.from("uploaded_publications").select("*")
      .eq("owner_scope", access.scope).order("uploaded_at").order("id").range(offset, offset + 99);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) entries.push({ publication: parsePublication(row.publication), raw: row.raw,
      filename: row.filename, sha256: row.sha256, uploadedAt: row.uploaded_at, transferred: row.transferred,
      ...(row.transferred_at ? { transferredAt: row.transferred_at } : {}) });
    if (!data || data.length < 100) break;
  }
  return entries;
}