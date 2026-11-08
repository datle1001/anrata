import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { cloudPublications } from "@/lib/publication-cloud.functions";
import { guestPublicationToken } from "@/lib/publication-access";
import { useSession } from "@/lib/oma/session";
import { Upload, Download, ArrowRight, CheckCircle2, Inbox, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompactHeader } from "@/components/compact-header";
import { usePublicationInbox } from "@/lib/use-publication-inbox";
import {
  addPublication,
  parsePublication,
  publicationTemplate,
  readInbox,
  writeInbox,
  removePublication,
  removeUnscreenedFilings,
} from "@/lib/publication-inbox";
import { downloadText } from "@/lib/review";

export const Route = createFileRoute("/publications")({
  component: PublicationPortal,
  head: () => ({
    meta: [
      { title: "Antara · Publication upload portal" },
      {
        name: "description",
        content:
          "Synthetic publication inbox for validated JSON uploads and expert review handoff.",
      },
      { property: "og:title", content: "Antara · Publication upload portal" },
      {
        property: "og:description",
        content:
          "Upload simulated publication releases, retain their sources and transfer rows for expert review.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});
function PublicationPortal() {
  const entries = usePublicationInbox();
  const cloud = useServerFn(cloudPublications);
  const user = useSession();
  const unscreened = entries.reduce(
    (n, e) =>
      n +
      e.publication.filings.filter(
        (f) => !f.pfdScreening || f.pfdScreening.status === "not-calculable",
      ).length,
    0,
  );
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Maximum upload size is 2 MB.");
      const raw = await file.text();
      const publication = parsePublication(JSON.parse(raw));
      const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
      const sha256 = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join(
        "",
      );
      const entry = {
          publication,
          raw,
          sha256,
          filename: file.name,
          uploadedAt: new Date().toISOString(),
          transferred: false,
        };
      // Validate duplicates without showing a local-only upload as successfully saved.
      addPublication(readInbox(localStorage), entry);
      writeInbox(await cloud({ data: { action: "save", token: guestPublicationToken(), entry } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid publication file.");
    } finally {
      setBusy(false);
    }
  }
  async function transfer(hash: string) {
    try {
      setError("");
      setBusy(true);
      const entry = entries.find((e) => e.sha256 === hash);
      if (!entry) throw new Error("Publication unavailable.");
      writeInbox(await cloud({ data: { action: "save", token: guestPublicationToken(), entry: { ...entry, transferred: true, transferredAt: new Date().toISOString() } } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cloud transfer failed.");
    } finally { setBusy(false); }
  }
  async function remove(next: typeof entries) {
    setBusy(true); setError("");
    try {
      let rows = entries;
      for (const entry of entries) {
        const kept = next.find((e) => e.sha256 === entry.sha256);
        if (!kept) rows = await cloud({ data: { action: "delete", token: guestPublicationToken(), sha256: entry.sha256 } });
        else if (kept.publication.filings.length !== entry.publication.filings.length)
          rows = await cloud({ data: { action: "save", token: guestPublicationToken(), entry: kept } });
      }
      writeInbox(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cloud deletion failed.");
    } finally { setBusy(false); }
  }
  return (
    <main className="desk-surface min-h-screen text-foreground">
      <CompactHeader portal />
      <section className="evidence-desk">
        <p className="text-xs font-semibold text-chart-1">INBOX / SYNTHETIC PUBLICATIONS</p>
        <h1 className="mt-3 text-3xl font-semibold">Publication inbox</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Simulation only · not connected to ITU · Cloud evidence: {user ? "your account" : "this guest workspace"}.
          Accepted uploads are immediately available to Oma, before desk transfer.
        </p>
        <div className="mt-7 flex flex-wrap gap-3 border-y border-border py-5">
          <Button onClick={() => input.current?.click()} disabled={busy}>
            <Upload />
            {busy ? "Saving to Cloud…" : "Upload publication JSON"}
          </Button>
          <input
            ref={input}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-label="Upload publication JSON"
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            onClick={() =>
              downloadText(
                JSON.stringify(publicationTemplate, null, 2),
                "sample-itu-circular.json",
                "application/json",
              )
            }
          >
            <Download />
            Download template
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Antara demo JSON, not an official ITU file format. Raw MDB preparation stays offline.
          Validation checks structure only; it does not calculate PFD, propagation or compliance.
        </p>
        {error && (
          <p role="alert" className="mt-4 whitespace-pre-wrap text-sm text-destructive">
            {error}
          </p>
        )}
        {entries.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Inbox className="mx-auto mb-4 size-10" />
            <p>No publications uploaded</p>
          </div>
        )}
        {unscreened > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-md border border-border p-4 text-sm">
            <span className="text-muted-foreground">
              {unscreened} uploaded filing(s) have no stored PFD result (grey “—”).
            </span>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive"
              disabled={busy}
              onClick={() => {
                if (confirm(`Remove ${unscreened} filing(s) without a stored PFD result?`))
                  void remove(removeUnscreenedFilings(entries));
              }}
            >
              <Trash2 />
              Remove grey filings
            </Button>
          </div>
        )}
        <ul className="mt-8">
          {entries.map((e) => (
            <li key={e.sha256} className="border-b border-border py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Simulated IFIC {e.publication.issue}</h2>
                <span className={e.transferred ? "text-secondary" : "text-chart-1"}>
                  {e.transferred ? "Transferred" : `${e.publication.filings.length} new filings`}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {e.filename} · supplied release {e.publication.publishedAt} ·{" "}
                {e.publication.filings.length} rows
              </p>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                SHA-256 {e.sha256}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!e.transferred ? (
                  <Button disabled={busy} onClick={() => void transfer(e.sha256)}>
                    <CheckCircle2 />
                    Scan & transfer to Space Desk
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/">
                      <ArrowRight />
                      Open review desk
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => downloadText(e.raw, e.filename, "application/json")}
                >
                  <Download />
                  Original file
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        `Delete ${e.filename} and its ${e.publication.filings.length} filings from the desk?`,
                      )
                    )
                      void remove(removePublication(entries, e.sha256));
                  }}
                >
                  <Trash2 />
                  Delete file
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
