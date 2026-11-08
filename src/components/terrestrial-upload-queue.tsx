import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { TerrestrialDetail } from "./terrestrial-detail";
import { useTerrestrialInbox } from "@/hooks/use-terrestrial-inbox";
import { terrestrialCloud } from "@/lib/terrestrial-cloud.functions";
import { guestPublicationToken } from "@/lib/publication-access";
import { terrestrialUploadRows, terrestrialInboxEvent } from "@/lib/terrestrial-upload";
import { siteName, intervalLabel, terrestrialTier } from "@/lib/terrestrial-review";
import { isUnreadFiling } from "@/lib/detail-review";
import { downloadText } from "@/lib/review";
import {
  defaultUploadFilters,
  filterUploadedTerrestrial,
  selectedTerrestrialEvidence,
  type UploadFilters,
} from "@/lib/terrestrial-upload-workspace";

export function TerrestrialUploadQueue() {
  const { entries, setEntries, error: loadError } = useTerrestrialInbox();
  const cloud = useServerFn(terrestrialCloud);
  const [filters, setFilters] = useState({ ...defaultUploadFilters });
  const [page, setPage] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  function filter(key: keyof UploadFilters, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  }
  const [selected, setSelected] = useState<string>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const rows = useMemo(() => terrestrialUploadRows(entries), [entries]);
  const filtered = filterUploadedTerrestrial(rows, filters);
  const pages = Math.max(1, Math.ceil(filtered.length / 25)),
    current = Math.min(page, pages - 1);
  const active = rows.find((r) => r.review?.id === selected);
  const visible = filtered.slice(current * 25, current * 25 + 25);
  const visibleIds = visible.flatMap((r) => (r.review ? [r.review.id] : []));
  const exportRows = selectedTerrestrialEvidence(rows, checked);
  async function review(
    id: string,
    state: "unreviewed" | "in-review" | "completed",
    viewed = false,
  ) {
    setBusy(true);
    setError("");
    try {
      setEntries(
        JSON.parse(
          await cloud({
            data: { action: "review", token: guestPublicationToken(), noticeId: id, state, viewed },
          }),
        ),
      );
      window.dispatchEvent(new Event(terrestrialInboxEvent));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review not saved.");
    } finally {
      setBusy(false);
    }
  }
  const byAdm = rows.reduce<Record<string, number>>((out, r) => {
    out[r.row.notice.raw.adm] = (out[r.row.notice.raw.adm] ?? 0) + 1;
    return out;
  }, {});
  return (
    <section className="py-6" aria-label="Uploaded terrestrial review queue">
      <h2 className="text-xl font-semibold">Uploaded Terrestrial publications</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {rows.length} supplied notices · {rows.filter((r) => r.entry.artifact.synthetic).length}{" "}
        synthetic · {rows.filter((r) => r.review?.state === "completed").length} reviewed. Separate
        from the real IFIC 3076 benchmark.
      </p>
      <div
        className="mt-5 grid grid-cols-2 gap-4 border-y border-border py-4 md:grid-cols-4"
        aria-label="Uploaded terrestrial workload"
      >
        {[
          [
            "unread",
            "Unread",
            rows.filter((r) => isUnreadFiling(r.review?.state ?? "unreviewed", r.review?.viewedAt))
              .length,
          ],
          [
            "outstanding",
            "Outstanding",
            rows.filter((r) => r.review?.state !== "completed").length,
          ],
          ["in-review", "In review", rows.filter((r) => r.review?.state === "in-review").length],
          ["completed", "Reviewed", rows.filter((r) => r.review?.state === "completed").length],
        ].map(([value, label, count]) => (
          <Button
            key={value}
            variant="ghost"
            aria-pressed={filters.workflow === value}
            className="h-auto flex-col items-start whitespace-normal text-left"
            onClick={() => {
              setFilters({ ...defaultUploadFilters, workflow: String(value) });
              setPage(0);
            }}
          >
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-2xl font-semibold">{count}</span>
          </Button>
        ))}
      </div>
      <div className="my-5 flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          aria-label="Search uploaded terrestrial notices"
          placeholder="Site, notice, administration or MHz"
          value={filters.query}
          onChange={(e) => filter("query", e.target.value)}
        />
        <Select value={filters.issue} onValueChange={(v) => filter("issue", v)}>
          <SelectTrigger aria-label="Uploaded terrestrial publication" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All uploaded issues</SelectItem>
            {entries
              .filter((e) => e.transferred)
              .map((e) => (
                <SelectItem key={e.id} value={String(e.artifact.issue)}>
                  IFIC {e.artifact.issue}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Select value={filters.workflow} onValueChange={(v) => filter("workflow", v)}>
          <SelectTrigger aria-label="Uploaded terrestrial workflow" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "unread", "outstanding", "unreviewed", "in-review", "completed"].map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(
          [
            [
              "administration",
              "Administration",
              [...new Set(rows.map((r) => r.row.notice.raw.adm))].sort(),
            ],
            ["relevance", "Finnish intervals", ["overlap", "no-overlap"]],
            ["tier", "Team priority", ["high", "medium", "low", "unclassified"]],
            ["comparison", "Comparison", ["new", "changed", "unchanged", "ambiguous"]],
            [
              "action",
              "Reported action",
              [...new Set(rows.map((r) => r.row.notice.raw.intent).filter(Boolean))].sort(),
            ],
            ["source", "Source", ["supplied", "synthetic"]],
          ] as [keyof UploadFilters, string, string[]][]
        ).map(([key, label, options]) => (
          <Select key={key} value={filters[key]} onValueChange={(v) => filter(key, v)}>
            <SelectTrigger aria-label={`Uploaded terrestrial ${label}`} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{label} · all</SelectItem>
              {options.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        <Button
          variant="ghost"
          onClick={() => {
            setFilters({ ...defaultUploadFilters });
            setPage(0);
          }}
        >
          <RotateCcw />
          Reset filters
        </Button>
        <Button
          variant="outline"
          disabled={!exportRows.length}
          onClick={() =>
            downloadText(
              JSON.stringify(exportRows, null, 2),
              "terrestrial-selected-evidence.json",
              "application/json",
            )
          }
        >
          <Download />
          Export selected evidence · {exportRows.length}
        </Button>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {filtered.length} matching notices · {exportRows.length} selected · team priority is not an
        interference verdict.
      </p>
      <details className="my-4 border-y border-border py-3">
        <summary className="cursor-pointer text-sm">Upload coverage by administration</summary>
        <p className="mt-3 text-xs text-muted-foreground">
          Workspace counts, not a trend in national activity. Missing files and absent records do
          not establish withdrawal.
        </p>
        <dl className="mt-3 flex flex-wrap gap-6">
          {Object.entries(byAdm).map(([adm, count]) => (
            <div key={adm}>
              <dt>{adm}</dt>
              <dd>{count} supplied notices</dd>
            </div>
          ))}
        </dl>
      </details>
      {(error || loadError) && (
        <p role="alert" className="my-3 text-destructive">
          {error || loadError}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-center text-sm">
          <thead className="border-y border-border text-muted-foreground">
            <tr>
              <th className="px-3">
                <Checkbox
                  aria-label="Select current terrestrial page"
                  checked={visibleIds.length > 0 && visibleIds.every((id) => checked.includes(id))}
                  disabled={!visibleIds.length}
                  onCheckedChange={(value) =>
                    setChecked((ids) =>
                      value === true
                        ? [...new Set([...ids, ...visibleIds])]
                        : ids.filter((id) => !visibleIds.includes(id)),
                    )
                  }
                />
              </th>
              <th className="py-3">Notice / IFIC</th>
              <th>Adm.</th>
              <th>Reported action</th>
              <th>Frequency · MHz</th>
              <th>Review priority</th>
              <th>Stored evidence</th>
              <th>Workflow</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ entry, row, review: r }) => (
              <tr
                key={r?.id ?? `${entry.id}:${row.notice.raw.terrakey}`}
                className="border-b border-border"
              >
                <td className="px-3">
                  <Checkbox
                    aria-label={`Select notice ${row.notice.raw.terrakey} IFIC ${entry.artifact.issue}`}
                    checked={!!r && checked.includes(r.id)}
                    disabled={!r}
                    onCheckedChange={(value) => {
                      if (r)
                        setChecked((ids) =>
                          value === true
                            ? [...new Set([...ids, r.id])]
                            : ids.filter((id) => id !== r.id),
                        );
                    }}
                  />
                </td>
                <td className="max-w-56 py-4">
                  <Button
                    variant="link"
                    className="h-auto whitespace-normal"
                    disabled={busy || !r}
                    onClick={() => {
                      if (!r) return;
                      setSelected(r.id);
                      void review(r.id, r.state === "unreviewed" ? "in-review" : r.state, true);
                    }}
                  >
                    {siteName(row)}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    IFIC {entry.artifact.issue} · {row.notice.raw.terrakey}
                  </p>
                  {isUnreadFiling(r?.state ?? "unreviewed", r?.viewedAt) && (
                    <span className="text-xs font-semibold text-secondary">NEW</span>
                  )}
                </td>
                <td>{row.notice.raw.adm}</td>
                <td>{row.notice.raw.intent || "Not reported"}</td>
                <td>{intervalLabel(row)}</td>
                <td>{terrestrialTier(row.notice.raw.adm).tier} · team triage</td>
                <td className="max-w-48">
                  {r?.changes?.status === "changed"
                    ? `${r.changes.fields.length} changes vs IFIC ${r.changes.baseline?.issue}`
                    : row.screenStatus}
                  <p className="text-xs text-muted-foreground">
                    {row.matchedFinnishRows.length} supplied Finnish matches
                  </p>
                </td>
                <td>{r?.state ?? "unreviewed"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <p className="py-10 text-center text-muted-foreground">No transferred notices match.</p>
      )}
      <div className="mt-4 flex items-center justify-end gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous uploaded terrestrial page"
          disabled={!current}
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeft />
        </Button>
        <span>
          {current + 1} / {pages}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next uploaded terrestrial page"
          disabled={current === pages - 1}
          onClick={() => setPage(current + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
      {active && active.review && (
        <TerrestrialDetail
          key={active.review.id}
          row={active.row}
          issue={active.entry.artifact.issue}
          synthetic={active.entry.artifact.synthetic}
          persistence="cloud"
          busy={busy}
          changes={active.review.changes}
          state={active.review.state}
          onState={(state) => {
            if (active.review) void review(active.review.id, state);
          }}
          onClose={() => setSelected(undefined)}
        />
      )}
    </section>
  );
}
