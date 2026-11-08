import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Download, Trash2, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { useTerrestrialInbox } from "@/hooks/use-terrestrial-inbox";
import { terrestrialCloud } from "@/lib/terrestrial-cloud.functions";
import { guestPublicationToken } from "@/lib/publication-access";
import { terrestrialInboxEvent, terrestrialTemplate } from "@/lib/terrestrial-upload";
import { downloadText } from "@/lib/review";

export function TerrestrialInbox() {
  const { entries, setEntries, error: loadError } = useTerrestrialInbox();
  const cloud = useServerFn(terrestrialCloud);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function act(data: {
    action: "save" | "transfer" | "delete";
    token: string;
    sha256?: string;
    entry?: { raw: string; filename: string };
  }) {
    setBusy(true);
    setError("");
    try {
      setEntries(JSON.parse(await cloud({ data })));
      window.dispatchEvent(new Event(terrestrialInboxEvent));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cloud operation failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Terrestrial publication inbox">
      <div className="my-6 flex flex-wrap gap-3 border-y border-border py-5">
        <Button disabled={busy} onClick={() => input.current?.click()}>
          <Upload />
          {busy ? "Saving…" : "Upload Terrestrial JSON"}
        </Button>
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Upload Terrestrial JSON"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 2 * 1024 * 1024) {
              setError("Maximum upload size is 2 MB.");
              return;
            }
            await act({
              action: "save",
              token: guestPublicationToken(),
              entry: { raw: await file.text(), filename: file.name },
            });
          }}
        />
        <Button
          variant="outline"
          onClick={() =>
            downloadText(
              JSON.stringify(terrestrialTemplate, null, 2),
              "terrestrial-review-template.json",
              "application/json",
            )
          }
        >
          <Download />
          Terrestrial template
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Land-mobile FB / ML · validated offline review JSON · original evidence retained. Scan
        transfers supplied results; no live P.1546 calculation.
      </p>
      {(error || loadError) && (
        <p role="alert" className="my-4 text-destructive">
          {error || loadError}
        </p>
      )}
      {!entries.length && (
        <p className="py-12 text-center text-muted-foreground">
          No Terrestrial publications uploaded
        </p>
      )}
      <ul>
        {entries.map((entry) => (
          <li key={entry.id} className="border-b border-border py-6">
            <div className="flex flex-wrap justify-between gap-3">
              <h2 className="text-lg font-semibold">Terrestrial IFIC {entry.artifact.issue}</h2>
              <span className="text-secondary">
                {entry.transferred
                  ? "Transferred"
                  : `${entry.artifact.records.length} notices · saved in Cloud`}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {entry.filename} · {entry.artifact.publishedAt} ·{" "}
              {entry.artifact.synthetic ? "Synthetic" : "Supplied offline evidence"}
            </p>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
              SHA-256 {entry.sha256}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!entry.transferred ? (
                <Button
                  disabled={busy}
                  onClick={() =>
                    void act({
                      action: "transfer",
                      token: guestPublicationToken(),
                      sha256: entry.sha256,
                    })
                  }
                >
                  <CheckCircle2 />
                  Scan & transfer to Terrestrial Desk
                </Button>
              ) : (
                <Button asChild>
                  <Link
                    to="/"
                    onClick={() => localStorage.setItem("antara:publication-tab", "terrestrial")}
                  >
                    <ArrowRight />
                    Open Terrestrial desk
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => downloadText(entry.raw, entry.filename, "application/json")}
              >
                <Download />
                Original file
              </Button>
              <Button
                variant="outline"
                className="text-destructive"
                disabled={busy}
                onClick={() => {
                  if (confirm(`Delete ${entry.filename}, all its notices and read/review states?`))
                    void act({
                      action: "delete",
                      token: guestPublicationToken(),
                      sha256: entry.sha256,
                    });
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
  );
}
