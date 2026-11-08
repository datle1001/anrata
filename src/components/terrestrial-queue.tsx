import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TerrestrialDetail } from "@/components/terrestrial-detail";
import asset from "@/data/terrestrial3076-screening.asset.json";
import { detailReviewState, isUnreadFiling } from "@/lib/detail-review";
import {
  defaultTerrestrialFilters,
  activeTerrestrialMetric,
  terrestrialMetricFilters,
  terrestrialTier,
  tierStyle,
  unresolvedTerrestrialReason,
  type TerrestrialMetric,
  filterTerrestrial,
  hasOverlap,
  intervalLabel,
  readTerrestrialFilters,
  readTerrestrialReviews,
  siteName,
  stateOf,
  terrestrialArtifactSchema,
  terrestrialFilterKey,
  terrestrialReviewEvent,
  terrestrialReviewKey,
  terrestrialWorkload,
  type ReviewState,
  type TerrestrialReviews,
  type TerrestrialRow,
} from "@/lib/terrestrial-review";

/** The asset URL is browser-served; load behind ClientOnly and retain the immutable query cache. */
export function TerrestrialQueue() {
  const [filters, setFilters] = useState(() => readTerrestrialFilters(localStorage));
  const [reviews, setReviews] = useState(() => readTerrestrialReviews(localStorage));
  const [selected, setSelected] = useState<TerrestrialRow | null>(null);
  const [error, setError] = useState("");
  const {
    data,
    isPending,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["terrestrial-offline-evidence", asset.asset_id],
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const response = await fetch(asset.url);
      if (!response.ok) throw new Error("Terrestrial evidence could not be loaded.");
      return terrestrialArtifactSchema.parse(await response.json());
    },
  });
  useEffect(() => {
    try {
      localStorage.setItem(terrestrialFilterKey, JSON.stringify(filters));
    } catch {
      setError("Filters could not be saved in this browser.");
    }
  }, [filters]);
  useEffect(() => {
    const refresh = () => setReviews(readTerrestrialReviews(localStorage));
    const storage = (event: StorageEvent) => {
      if (event.key === terrestrialReviewKey || event.key === null) refresh();
      if (event.key === terrestrialFilterKey || event.key === null)
        setFilters(readTerrestrialFilters(localStorage));
    };
    window.addEventListener(terrestrialReviewEvent, refresh);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(terrestrialReviewEvent, refresh);
      window.removeEventListener("storage", storage);
    };
  }, []);
  const rows = useMemo(() => data?.records ?? [], [data]);
  const filtered = useMemo(
    () => filterTerrestrial(rows, reviews, filters),
    [rows, reviews, filters],
  );
  const counts = terrestrialWorkload(rows, reviews);
  const administrations = [...new Set(rows.map((r) => r.notice.raw.adm))].sort();
  const scopeRows = rows.filter(
    (r) =>
      filters.relevance === "all" ||
      (filters.relevance === "overlap" ? hasOverlap(r) : !hasOverlap(r)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const page = Math.min(filters.page, pages - 1);
  function changeState(row: TerrestrialRow, state: ReviewState, viewed = false) {
    try {
      const stored = readTerrestrialReviews(localStorage);
      const id = row.notice.raw.terrakey;
      const at = new Date().toISOString();
      const next: TerrestrialReviews = {
        ...stored,
        [id]: {
          ...stored[id],
          state,
          updatedAt: at,
          ...(viewed ? { viewedAt: stored[id]?.viewedAt ?? at } : {}),
        },
      };
      localStorage.setItem(terrestrialReviewKey, JSON.stringify({ version: 1, reviews: next }));
      setReviews(next);
      window.dispatchEvent(new Event(terrestrialReviewEvent));
      setError("");
    } catch {
      setError("Review was not saved. Browser storage is unavailable.");
    }
  }
  if (isPending)
    return (
      <p role="status" className="py-12 text-muted-foreground">
        Loading stored Terrestrial IFIC 3076 notices…
      </p>
    );
  if (loadError)
    return (
      <div className="py-8">
        <p role="alert" className="mb-3 text-destructive">
          Terrestrial evidence is unavailable. No screening result has changed.
        </p>
        <Button variant="outline" onClick={() => void refetch()}>
          <RotateCcw />
          Retry loading
        </Button>
      </div>
    );
  return (
    <section className="py-7" aria-label="Terrestrial review queue">
      <div
        className="grid grid-cols-2 gap-5 border-y border-border py-6 md:grid-cols-4"
        aria-label="Terrestrial outstanding workload"
        aria-live="polite"
      >
        {(
          [
            ["overlap", "Outstanding overlap", counts.overlap],
            ["unresolved", "Outstanding no-overlap · unresolved", counts.unresolved],
            ["inReview", "In review", counts.inReview],
            ["reviewed", "Reviewed", counts.reviewed],
          ] as [TerrestrialMetric, string, number][]
        ).map(([key, label, value]) => (
          <Button
            key={key}
            variant="outline"
            aria-pressed={activeTerrestrialMetric(filters) === key}
            onClick={() => setFilters(terrestrialMetricFilters(key))}
            className={`h-auto min-h-28 flex-col items-start justify-between whitespace-normal p-4 text-left ${activeTerrestrialMetric(filters) === key ? "border-secondary bg-secondary/10 ring-1 ring-secondary" : ""}`}
          >
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="mt-2 text-3xl font-semibold">{value}</span>
          </Button>
        ))}
      </div>
      <div className="my-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Terrestrial review queue</h2>
        <Button variant="ghost" onClick={() => setFilters({ ...defaultTerrestrialFilters })}>
          <RotateCcw />
          Reset filters
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_210px_170px]">
        <div className="relative">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            aria-label="Search terrestrial notices"
            placeholder="Site, ID or frequency · MHz"
            value={filters.query}
            onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value, page: 0 }))}
          />
        </div>
        <Select
          value={filters.administration}
          onValueChange={(v) => setFilters((f) => ({ ...f, administration: v, page: 0 }))}
        >
          <SelectTrigger aria-label="Terrestrial administration">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All administrations</SelectItem>
            {administrations.map((adm) => (
              <SelectItem key={adm} value={adm}>
                {adm} ({scopeRows.filter((r) => r.notice.raw.adm === adm).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.relevance}
          onValueChange={(v) => setFilters((f) => ({ ...f, relevance: v, page: 0 }))}
        >
          <SelectTrigger aria-label="Terrestrial frequency relevance">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="overlap">Excel overlap (200)</SelectItem>
            <SelectItem value="no-overlap">No overlap · unresolved (1,658)</SelectItem>
            <SelectItem value="all">All stored notices (1,858)</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.workflow}
          onValueChange={(v) => setFilters((f) => ({ ...f, workflow: v, page: 0 }))}
        >
          <SelectTrigger aria-label="Terrestrial review workflow">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All review states</SelectItem>
            <SelectItem value="outstanding">Outstanding</SelectItem>
            <SelectItem value="unreviewed">Unreviewed</SelectItem>
            <SelectItem value="in-review">In review</SelectItem>
            <SelectItem value="completed">Reviewed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Select
          value={filters.tier}
          onValueChange={(tier) => setFilters((f) => ({ ...f, tier, page: 0 }))}
        >
          <SelectTrigger className="w-56" aria-label="Geographic review tier">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All geographic review tiers</SelectItem>
            <SelectItem value="high">High · RUS</SelectItem>
            <SelectItem value="medium">Medium · POL</SelectItem>
            <SelectItem value="low">Low · KAZ / CHN</SelectItem>
            <SelectItem value="unclassified">Unclassified</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Team geographic triage · not calculated interference risk or clearance
        </p>
      </div>
      {filters.relevance === "no-overlap" && (
        <p className="mt-4 border-l-2 border-chart-1 pl-4 text-sm text-muted-foreground">
          {unresolvedTerrestrialReason}
        </p>
      )}
      <p className="my-4 text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} matching notices ·{" "}
        {filters.relevance === "overlap"
          ? "Excel-overlap subset"
          : filters.relevance === "no-overlap"
            ? "Unresolved no-overlap subset"
            : "All stored publication rows"}{" "}
        · IFIC 3076
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-y border-border text-muted-foreground">
            <tr>
              <th className="py-3">Notice / site</th>
              <th>Adm.</th>
              <th>Geographic review tier</th>
              <th>Frequency · MHz</th>
              <th>Finnish matches</th>
              <th>Geographic evidence</th>
              <th>Review state</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(page * 25, page * 25 + 25).map((row) => (
              <tr key={row.notice.raw.terrakey} className="border-b border-border">
                <td className="max-w-52 py-4">
                  <Button
                    variant="link"
                    className="h-auto max-w-full whitespace-normal p-0 text-left text-secondary"
                    onClick={() => {
                      setSelected(row);
                      changeState(
                        row,
                        detailReviewState(stateOf(row, reviews)) as ReviewState,
                        true,
                      );
                    }}
                  >
                    {siteName(row)}
                  </Button>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {row.notice.raw.terrakey}
                  </p>
                </td>
                <td>{row.notice.raw.adm}</td>
                <td>
                  <span
                    title={terrestrialTier(row.notice.raw.adm).reason}
                    className={`inline-block rounded border px-2 py-1 text-xs capitalize ${tierStyle[terrestrialTier(row.notice.raw.adm).tier]}`}
                  >
                    {terrestrialTier(row.notice.raw.adm).tier}
                    {isUnreadFiling(
                      stateOf(row, reviews),
                      reviews[row.notice.raw.terrakey]?.viewedAt,
                    )
                      ? " · review"
                      : ""}
                  </span>
                </td>
                <td>{intervalLabel(row)}</td>
                <td>{row.matchedFinnishRows.length} Excel rows</td>
                <td className="text-xs text-muted-foreground">
                  {row.transmitterLocations.some((l) => l.reportedPoint)
                    ? "Reported point · datum unverified"
                    : "Area / point unresolved"}
                  <p className="mt-1">Distance: not generally prepared</p>
                </td>
                <td>
                  {stateOf(row, reviews) === "completed"
                    ? "Reviewed"
                    : stateOf(row, reviews) === "in-review"
                      ? "In review"
                      : "Unreviewed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="py-10 text-center text-muted-foreground">No notices match these filters.</p>
      )}
      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {filtered.length ? page * 25 + 1 : 0}–{Math.min((page + 1) * 25, filtered.length)} of{" "}
          {filtered.length}
        </span>
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="outline"
            aria-label="Previous terrestrial page"
            disabled={page === 0}
            onClick={() => setFilters((f) => ({ ...f, page: page - 1 }))}
          >
            <ChevronLeft />
          </Button>
          <span className="text-sm">
            {page + 1} / {pages}
          </span>
          <Button
            size="icon"
            variant="outline"
            aria-label="Next terrestrial page"
            disabled={page === pages - 1}
            onClick={() => setFilters((f) => ({ ...f, page: page + 1 }))}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
      {selected && (
        <TerrestrialDetail
          key={selected.notice.raw.terrakey}
          row={selected}
          state={stateOf(selected, reviews)}
          updatedAt={reviews[selected.notice.raw.terrakey]?.updatedAt}
          onState={(state) => changeState(selected, state)}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
