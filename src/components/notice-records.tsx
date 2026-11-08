import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, ChevronDown, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { downloadText } from "@/lib/review";
import {
  buildLetter,
  ghz,
  pfdLabel,
  pfdMeta,
  pfdOf,
  refBw,
  reviewReasons,
  stationOf,
  type NoticeRecord,
  type PfdGroup,
} from "@/lib/dossier";
import data from "@/data/ific3074-notice-records.json";
import demos from "@/data/demo-filings.json";
import { useSession } from "@/lib/oma/session";
import { supabase } from "@/integrations/supabase/client";
import type { WorkspaceCommand } from "@/lib/oma/workspace";
import { LetterDialog } from "@/components/letter-dialog";
import { SyntheticSpaceRecord } from "@/components/new-publications";
import { deskPage, latestScan, matchesSpaceWorkflow, transferredSpaceRows } from "@/lib/space-desk";
import { Link } from "@tanstack/react-router";
import {
  guestKeys,
  guestReviews,
  guestReviewEvent,
  recordGuestAction,
} from "@/lib/oma/guest-storage";
import { usePublicationInbox } from "@/lib/use-publication-inbox";
import { outstandingCounts } from "@/lib/review-counts";

const statusStyle: Record<string, string> = {
  exceeds: "text-destructive border-destructive/50",
  "near-limit": "text-chart-1 border-chart-1/50",
  within: "text-chart-2 border-chart-2/50",
  "not-calculable": "text-muted-foreground border-border",
};
const statusOrder: Record<string, number> = {
  exceeds: 0,
  "near-limit": 1,
  within: 2,
  "not-calculable": 3,
};
const ranges = [
  { id: "all", label: "All bands", lo: 0, hi: Infinity },
  { id: "low", label: "VHF / UHF / L / S (< 3.4 GHz)", lo: 0, hi: 3400 },
  { id: "c", label: "C-band (3.4–8 GHz)", lo: 3400, hi: 8000 },
  { id: "x", label: "X-band (8–10.7 GHz)", lo: 8000, hi: 10700 },
  { id: "ku", label: "Ku-band (10.7–14.5 GHz)", lo: 10700, hi: 14500 },
  { id: "ka", label: "Ka-band (17.3–31 GHz)", lo: 17300, hi: 31000 },
  { id: "hi", label: "Q/V and above (> 37 GHz)", lo: 37000, hi: Infinity },
] as const;

function PfdCalc({ g }: { g: PfdGroup }) {
  const w = g.worstPoint;
  const bw = 10 * Math.log10(g.referenceBandwidthHz);
  return (
    <div className="rounded-md bg-muted p-4 font-mono text-xs leading-relaxed">
      <p className="mb-2 font-sans text-sm font-medium">
        {ghz(g.freqLowMHz)}–{ghz(g.freqHighMHz)} · group {g.groupId} · beam {g.beam}
      </p>
      <p>
        Sample maximum point: {w.point.label} ({w.point.lat.toFixed(3)}° N, {w.point.lon.toFixed(3)}
        ° E)
      </p>
      <p>
        Satellite {g.inputs.satelliteLongitudeDeg}° · range {w.slantRangeKm} km · arrival angle{" "}
        {w.arrivalAngleDeg}°
      </p>
      <p className="mt-2">PFD = PSD + G + 10log(BW) − 10log(4πd²)</p>
      <p>
        {" "}
        = {g.inputs.psdMaxDbwHz.toFixed(1)} + {g.inputs.gainMaxDbi.toFixed(1)} + {bw.toFixed(1)} −{" "}
        {w.spreadingLossDb.toFixed(1)}
      </p>
      <p>
        {" "}
        ={" "}
        <strong>
          {w.pfdDb.toFixed(1)} dB(W/m²) in {refBw(g.referenceBandwidthHz)}
        </strong>
      </p>
      <p className="mt-2">
        Limit at {w.arrivalAngleDeg}° = {w.limitDb.toFixed(1)} → margin{" "}
        <strong className={w.marginDb > 0 ? "text-destructive" : ""}>
          {w.marginDb > 0 ? "+" : ""}
          {w.marginDb.toFixed(1)} dB
        </strong>
      </p>
      <p className="mt-2 font-sans text-muted-foreground">
        Source: {g.citation} — {g.service}
      </p>
      {g.footnoteCheck && <p className="font-sans text-chart-1">{g.footnoteCheck}</p>}
    </div>
  );
}

function RecordCard({
  r,
  forcedOpen,
  workflow,
  onState,
}: {
  r: NoticeRecord;
  forcedOpen: boolean;
  workflow: string;
  onState: (id: string, state: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);
  const [letter, setLetter] = useState(() => buildLetter(r));
  const forcedSeen = useRef(false);
  useEffect(() => {
    if (!forcedOpen) forcedSeen.current = false;
    if (forcedOpen && !forcedSeen.current) {
      forcedSeen.current = true;
      setOpen(true);
      if (workflow === "unreviewed") onState(r.noticeId, "in-review");
    }
  }, [forcedOpen, workflow, onState, r.noticeId]);
  const p = pfdOf(r);
  const st = r.finnishStations.map((id) => ({ id, s: stationOf(id) }));
  return (
    <li className="border-b border-border">
      <Button
        variant="ghost"
        className="flex h-auto w-full items-center gap-4 whitespace-normal py-4 text-left"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open && workflow === "unreviewed") onState(r.noticeId, "in-review");
        }}
      >
        <span
          className={`w-20 shrink-0 rounded border py-1 text-center font-mono text-sm ${statusStyle[p.status]}`}
        >
          {p.worstMarginDb != null
            ? `${p.worstMarginDb > 0 ? "+" : ""}${p.worstMarginDb.toFixed(1)} dB`
            : "—"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-words font-medium">{r.network}</span>
          <span className="block break-words text-sm text-muted-foreground">
            {r.administration} · {r.orbit} · {ghz(r.frequencyLowMHz)}–{ghz(r.frequencyHighMHz)} ·
            IFIC {data.issue}
          </span>
          {p.status === "not-calculable" && (
            <span className="mt-1 block text-xs text-muted-foreground">
              {r.orbit === "Non-GSO"
                ? "Time-dependent evidence missing"
                : r.features.missingPower
                  ? "Transmitter power evidence missing"
                  : "Inputs / applicability unresolved"}
            </span>
          )}
        </span>
        <span className={`max-w-28 text-xs ${(statusStyle[p.status] ?? "").split(" ")[0]}`}>
          {pfdLabel[p.status]}
          <span className="mt-1 block text-muted-foreground">{workflow}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </Button>
      {open && (
        <div className="space-y-5 pb-6">
          <div className="border-l-2 border-secondary pl-4">
            <h3 className="mb-2 text-xs font-semibold text-secondary">REVIEW TRIGGER</h3>
            <p className="mb-3 text-lg font-semibold">
              {p.worstMarginDb != null
                ? `Stored sample margin ${p.worstMarginDb > 0 ? "+" : ""}${p.worstMarginDb.toFixed(1)} dB · applicability requires expert review`
                : r.orbit === "Non-GSO"
                  ? "Non-GSO · time-dependent evidence required"
                  : r.features.missingPower
                    ? "Missing transmitter power evidence"
                    : (p.reason ?? "Frequency overlap · technical finding unresolved")}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {reviewReasons(r).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setLetterOpen(true)}>
                <Eye />
                Preview / edit letter
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onState(r.noticeId, workflow === "completed" ? "unreviewed" : "completed")
                }
              >
                <CheckCircle2 />
                {workflow === "completed" ? "Reopen review" : "Complete review"}
              </Button>
              <span className="self-center text-xs text-muted-foreground">
                {workflow} · completion is not technical clearance
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Network", r.network],
              ["Administration", r.administration],
              ["Publication", `BR IFIC ${data.issue} · RR ${r.reference.provision}`],
              ["Notice ID", r.noticeId],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="break-words font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <details className="rounded-md border border-border p-4" open={p.groups.length > 0}>
            <summary className="cursor-pointer text-sm font-semibold">
              PFD calculation{" "}
              {p.groups.length
                ? `(${p.groupsCalculated} group(s), worst ${Math.min(p.groups.length, 3)} shown)`
                : "— not calculated"}
            </summary>
            <div className="mt-3 space-y-3">
              {p.groups.length ? (
                p.groups.slice(0, 3).map((g) => <PfdCalc key={g.groupId} g={g} />)
              ) : (
                <p className="text-sm text-muted-foreground">{p.reason}</p>
              )}
              {p.groups.length > 0 && p.reason && (
                <p className="text-xs text-muted-foreground">Other groups skipped: {p.reason}</p>
              )}
            </div>
          </details>

          <details className="rounded-md border border-border p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Affected Finnish frequencies ({st.length} stations)
            </summary>
            <p className="mt-2 text-xs text-muted-foreground">
              From Traficom's national list. Some of these may not be notified to the ITU, so the
              ITU would not warn Finland about them.
            </p>
            <div className="mt-3 max-h-64 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1">Station</th>
                    <th>Class</th>
                    <th>RX band</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {st.map(({ id, s }) => (
                    <tr key={id} className="border-t border-border">
                      <td className="py-1">{id}</td>
                      <td>{s?.class ?? "—"}</td>
                      <td>{s ? `${s.lowMHz.toFixed(2)}–${s.highMHz.toFixed(2)} MHz` : "—"}</td>
                      <td>{s?.lat != null ? `${s.lat.toFixed(2)}, ${s.lon?.toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <details className="rounded-md border border-border p-4 text-xs">
            <summary className="cursor-pointer text-sm font-semibold">Audit trail</summary>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              <li>
                Filing source: {r.source.file} · tables {r.source.tables.join(", ")} · notice{" "}
                {r.noticeId}
              </li>
              <li>Finnish data: {pfdMeta.inputs.finland}</li>
              <li>
                Limits: {pfdMeta.inputs.limits} · SHA-256 {pfdMeta.limitsSha256.slice(0, 16)}…
              </li>
              <li>
                Calculated by {pfdMeta.script} at {pfdMeta.generatedAt} over{" "}
                {pfdMeta.evaluationPoints} Finnish points
              </li>
              <li>Method: {pfdMeta.method}</li>
              {pfdMeta.assumptions.map((a) => (
                <li key={a}>Assumption: {a}</li>
              ))}
            </ul>
            <button
              className="mt-3 text-secondary hover:underline"
              onClick={() =>
                downloadText(
                  JSON.stringify(
                    {
                      record: r,
                      pfd: p,
                      method: pfdMeta.method,
                      assumptions: pfdMeta.assumptions,
                      generatedAt: pfdMeta.generatedAt,
                    },
                    null,
                    2,
                  ),
                  `audit-${r.noticeId}.json`,
                  "application/json",
                )
              }
            >
              Download audit record (JSON)
            </button>
          </details>
          <LetterDialog
            title={r.network}
            fileName={`Letter_${r.network.replace(/\W+/g, "_")}_IFIC${data.issue}.docx`}
            reset={() => buildLetter(r)}
            letter={letter}
            setLetter={setLetter}
            open={letterOpen}
            onOpenChange={setLetterOpen}
          />
        </div>
      )}
    </li>
  );
}

const quick = ["RUS", "S", "NOR", "EST", "USA", "F", "CHN", "J", "G", "D", "LUX", "IND"];
const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

export function NoticeRecords({
  command,
  onWorkspace,
}: {
  command: { value: WorkspaceCommand; seq: number } | null;
  onWorkspace: (w: unknown) => void;
}) {
  const user = useSession();
  const entries = usePublicationInbox();
  const [syntheticReviews, setSyntheticReviews] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Record<string, string>>({});
  const [workflow, setWorkflow] = useState("outstanding");
  const [demo, setDemo] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    setReviews({});
    if (!user) {
      const refresh = () => setReviews(guestReviews(localStorage));
      refresh();
      window.addEventListener("storage", refresh);
      window.addEventListener(guestReviewEvent, refresh);
      return () => {
        window.removeEventListener("storage", refresh);
        window.removeEventListener(guestReviewEvent, refresh);
      };
    }
    let mounted = true;
    void supabase
      .from("filing_reviews")
      .select("filing_id,state")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else if (mounted)
          setReviews(Object.fromEntries((data ?? []).map((r) => [r.filing_id, r.state])));
      });
    return () => {
      mounted = false;
    };
  }, [user]);
  useEffect(() => {
    const refresh = () => setSyntheticReviews(guestReviews(localStorage));
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(guestReviewEvent, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(guestReviewEvent, refresh);
    };
  }, []);
  const changeState = async (id: string, next: string) => {
    if (user) {
      const { error } = await supabase.from("filing_reviews").upsert({
        user_id: user.id,
        filing_id: id,
        state: next,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      const { error: auditError } = await supabase.from("oma_audit").insert({
        user_id: user.id,
        action: "expert-review-state",
        evidence: { filingId: id, state: next, technicalClearance: false },
      });
      if (auditError) {
        toast.error(auditError.message);
        return;
      }
    }
    if (!user) {
      try {
        localStorage.setItem(
          guestKeys.reviews,
          JSON.stringify({ ...guestReviews(localStorage), [id]: next }),
        );
        window.dispatchEvent(new Event(guestReviewEvent));
        recordGuestAction("expert-review-state", {
          filingId: id,
          state: next,
          technicalClearance: false,
        });
      } catch {
        toast.error("Browser storage unavailable — review was not saved.");
        return;
      }
    }
    setReviews((old) => ({ ...old, [id]: next }));
    if (next === "completed")
      toast.success("Review completed — evidence status unchanged", {
        description: user ? "Saved to your account." : "Saved in this browser.",
      });
  };
  const [restored, setRestored] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [publication, setPublication] = useState("all");
  const [country, setCountry] = useState("all");
  const [orbit, setOrbit] = useState("all");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState("risk");
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem("antara:desk-filters:v1") ?? "{}");
      if (typeof v.query === "string") setQuery(v.query);
      if (["all", "exceeds", "near-limit", "within", "not-calculable"].includes(v.status))
        setStatus(v.status);
      if (["all", "outstanding", "unreviewed", "in-review", "completed"].includes(v.workflow))
        setWorkflow(v.workflow);
      if (typeof v.country === "string") setCountry(v.country);
      if (typeof v.orbit === "string") setOrbit(v.orbit);
      if (ranges.some((r) => r.id === v.range)) setRange(v.range);
      if (["risk", "low", "stations"].includes(v.sort)) setSort(v.sort);
      if (Number.isInteger(v.page) && v.page >= 0) setPage(v.page);
      if (typeof v.publication === "string") setPublication(v.publication);
      if (typeof v.demo === "boolean") setDemo(v.demo);
    } catch {
      /* Keep initial controls when browser storage is invalid. */
    }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        "antara:desk-filters:v1",
        JSON.stringify({
          query,
          status,
          workflow,
          country,
          orbit,
          range,
          sort,
          page,
          publication,
          demo,
        }),
      );
    } catch {
      /* Existing prepared evidence remains visible. */
    }
  }, [restored, query, status, workflow, country, orbit, range, sort, page, publication, demo]);
  useEffect(() => {
    setPage(0);
  }, [query, status, workflow, country, orbit, range, sort, publication, demo]);
  const countries = useMemo(
    () =>
      [
        ...new Set([
          ...data.records.map((r) => r.administration),
          ...entries
            .filter((e) => e.transferred)
            .flatMap((e) => e.publication.filings.map((f) => f.administration)),
        ]),
      ].sort(),
    [entries],
  );
  const counts = outstandingCounts(
    demo
      ? demos.records.map((r) => ({ id: r.id, status: r.status }))
      : data.records.map((r) => ({ id: r.noticeId, status: pfdOf(r).status })),
    reviews,
  );
  const newCounts = outstandingCounts(
    entries
      .filter((e) => e.transferred)
      .flatMap((e) =>
        e.publication.filings.map((f) => ({
          id: `SIM:${e.publication.issue}:${f.id}`,
          status: f.pfdScreening?.status ?? "not-calculable",
        })),
      ),
    syntheticReviews,
  );
  const synthOf = (b: string) => (demo ? 0 : (newCounts[b] ?? 0));
  useEffect(() => {
    if (!command) return;
    const c = command.value;
    if (c.status) setStatus(c.status);
    if (c.query !== null) setQuery(c.query);
    if (c.workflow) setWorkflow(c.workflow);
    if (c.sort) setSort(c.sort);
    if (c.demo !== null) setDemo(c.demo);
    if (c.filingId) {
      setActive(c.filingId);
      setQuery(c.filingId);
      setStatus("all");
      setWorkflow("all");
      setCountry("all");
      setOrbit("all");
      setRange("all");
      setDemo(c.filingId.startsWith("DEMO-"));
    }
  }, [command]);
  useEffect(() => {
    onWorkspace({
      publication: "space",
      status,
      query,
      workflow,
      demo,
      sort,
      activeFiling: active,
    });
  }, [onWorkspace, status, query, workflow, demo, sort, active]);
  const rg = ranges.find((x) => x.id === range) ?? ranges[0];
  const list = data.records
    .filter(
      (r) =>
        (publication === "all" || publication === String(data.issue)) &&
        matchesSpaceWorkflow(reviews[r.noticeId] ?? "unreviewed", workflow) &&
        (status === "all" || pfdOf(r).status === status) &&
        (country === "all" || r.administration === country) &&
        (orbit === "all" || r.orbit.startsWith(orbit)) &&
        r.frequencyHighMHz > rg.lo &&
        r.frequencyLowMHz < rg.hi &&
        `${r.network} ${r.administration} ${r.noticeId}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === "stations") return b.features.finnishStations - a.features.finnishStations;
      const pa = pfdOf(a),
        pb = pfdOf(b);
      const d =
        (statusOrder[pa.status] ?? 9) - (statusOrder[pb.status] ?? 9) ||
        (pb.worstMarginDb ?? -99) - (pa.worstMarginDb ?? -99) ||
        b.priority.score - a.priority.score;
      return sort === "low" ? -d : d;
    });
  const demoList = demos.records.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      matchesSpaceWorkflow(reviews[r.id] ?? "unreviewed", workflow) &&
      (orbit === "all" || r.orbit === orbit) &&
      r.hi > rg.lo &&
      r.lo < rg.hi &&
      `${r.network} ${r.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  const syntheticRows = transferredSpaceRows(entries);
  const scan = latestScan(syntheticRows);
  const uploadedList = syntheticRows.filter(
    (r) =>
      (publication === "all" || publication === r.issue) &&
      (status === "all" || status === r.status) &&
      matchesSpaceWorkflow(syntheticReviews[r.id] ?? "unreviewed", workflow) &&
      (country === "all" || r.filing.administration === country) &&
      (orbit === "all" || r.filing.orbit === orbit) &&
      r.filing.upperMHz > rg.lo &&
      r.filing.lowerMHz < rg.hi &&
      `${r.filing.name} ${r.filing.administration} ${r.filing.id} ${r.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const combined = [
    ...uploadedList.map((record) => ({ kind: "synthetic" as const, record })),
    ...list.map((record) => ({ kind: "real" as const, record })),
  ];
  const paginated = deskPage(combined, page);
  const visibleCount = demo ? demoList.length : combined.length;
  const workflowIds = demo
    ? demos.records.map((r) => ({ id: r.id, state: reviews[r.id] ?? "unreviewed" }))
    : [
        ...data.records.map((r) => ({
          id: r.noticeId,
          state: reviews[r.noticeId] ?? "unreviewed",
        })),
        ...syntheticRows.map((r) => ({ id: r.id, state: syntheticReviews[r.id] ?? "unreviewed" })),
      ];
  function changeSyntheticState(id: string, next: string) {
    try {
      localStorage.setItem(
        guestKeys.reviews,
        JSON.stringify({ ...guestReviews(localStorage), [id]: next }),
      );
      window.dispatchEvent(new Event(guestReviewEvent));
    } catch {
      toast.error("Browser storage unavailable — review was not saved.");
    }
  }
  const reset = () => {
    setQuery("");
    setStatus("all");
    setCountry("all");
    setOrbit("all");
    setRange("all");
    setSort("risk");
    setWorkflow("all");
    setActive(null);
    setPublication("all");
    setPage(0);
  };
  return (
    <section className="evidence-desk">
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-semibold">Space review desk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          IFIC {data.issue} · {data.records.length} real candidates · {syntheticRows.length}{" "}
          separate synthetic uploads
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            className={sel}
            aria-label="Space publication"
            value={publication}
            onChange={(e) => setPublication(e.target.value)}
          >
            <option value="all">All publications · labelled sources</option>
            <option value={String(data.issue)}>IFIC {data.issue} · real evidence</option>
            {entries
              .filter((e) => e.transferred)
              .map((e) => (
                <option key={e.sha256} value={String(e.publication.issue)}>
                  IFIC {e.publication.issue} · synthetic · {e.publication.publishedAt}
                </option>
              ))}
          </select>
          <Button asChild variant="outline" size="sm">
            <Link to="/publications">Publication inbox</Link>
          </Button>
          {entries.some((e) => !e.transferred) && (
            <span className="text-xs text-chart-1">New uploads awaiting transfer</span>
          )}
        </div>
      </div>
      <>
        <div className="mt-5 flex flex-wrap gap-2">
          {["outstanding", "all", "unreviewed", "in-review", "completed"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={workflow === s ? "secondary" : "outline"}
              onClick={() => setWorkflow(s)}
              aria-pressed={workflow === s}
            >
              {s === "outstanding"
                ? "Outstanding"
                : s === "all"
                  ? "All reviews"
                  : s === "in-review"
                    ? "In review"
                    : s === "completed"
                      ? "Reviewed archive"
                      : "Unread"}{" "}
              {workflowIds.filter((r) => matchesSpaceWorkflow(r.state, s)).length}
            </Button>
          ))}
          <Button
            size="sm"
            variant={demo ? "secondary" : "outline"}
            onClick={() => {
              setDemo(!demo);
              reset();
            }}
            aria-pressed={demo}
          >
            Demo scenarios
          </Button>
        </div>
        <p className="mt-6 text-sm font-semibold">Outstanding reviews</p>
        <div
          className="my-3 grid grid-cols-2 gap-3 sm:grid-cols-4"
          aria-label="Outstanding review counts"
          aria-live="polite"
        >
          {(["exceeds", "near-limit", "within", "not-calculable"] as const).map((b) => (
            <Button
              variant="outline"
              key={b}
              onClick={() => {
                if (status === b && workflow === "outstanding") {
                  setStatus("all");
                  return;
                }
                setStatus(b);
                setWorkflow("outstanding");
                setCountry("all");
                setQuery("");
                setOrbit("all");
                setRange("all");
                setPublication("all");
              }}
              aria-pressed={status === b && workflow === "outstanding"}
              className={`h-auto flex-col items-start rounded-lg border p-4 text-left ${status === b ? "bg-muted" : ""} ${statusStyle[b]}`}
            >
              <p className="text-2xl font-semibold">{(counts[b] ?? 0) + synthOf(b)}</p>
              <p className="text-xs">{pfdLabel[b]}</p>
              {synthOf(b) > 0 && (
                <p className="text-xs">
                  {counts[b] ?? 0} real · {synthOf(b)} synthetic
                </p>
              )}
            </Button>
          ))}
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search network, country or notice ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search notices"
          />
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Quick country filter">
          <span className="text-xs text-muted-foreground">Administration:</span>
          {["all", ...countries.filter((c) => quick.includes(c))].map((c) => (
            <Button
              key={c}
              size="sm"
              variant={country === c ? "default" : "outline"}
              aria-pressed={country === c}
              onClick={() => setCountry(c)}
            >
              {c === "all" ? "All" : c}
            </Button>
          ))}
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select
            className={sel}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort"
          >
            <option value="risk">Screening margin first</option>
            <option value="low">Reverse screening order</option>
            <option value="stations">Most overlapping Finnish stations</option>
          </select>
          <select
            className={sel}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            aria-label="Country"
          >
            <option value="all">All countries</option>
            {countries.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select
            className={sel}
            value={orbit}
            onChange={(e) => setOrbit(e.target.value)}
            aria-label="Orbit"
          >
            <option value="all">GSO + Non-GSO</option>
            <option>GSO</option>
            <option>Non-GSO</option>
          </select>
          <select
            className={sel}
            value={range}
            onChange={(e) => setRange(e.target.value)}
            aria-label="Frequency range"
          >
            {ranges.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">{visibleCount} results</span>
        </div>
        {demo ? (
          <>
            <p className="mb-4 text-sm text-chart-1">
              SYNTHETIC DEMO — not ITU filings, calculations or evidence for correspondence.
            </p>
            <ul>
              {demoList.map((r) => (
                <li key={r.id} className="border-b border-border py-4">
                  <details open={active === r.id}>
                    <summary className="cursor-pointer font-semibold">
                      {r.network}{" "}
                      <span className={`ml-3 text-xs ${statusStyle[r.status]}`}>{r.trigger}</span>
                      <span className="ml-3 text-xs text-muted-foreground">{r.id} · DEMO</span>
                    </summary>
                    <div className="mt-4 space-y-3 border-l-2 border-secondary pl-4">
                      <h3 className="text-xs font-semibold text-secondary">REVIEW TRIGGER</h3>
                      <p className="text-lg font-semibold">{r.summary}</p>
                      <p className="text-sm">
                        <strong>Frequency:</strong> {r.lo}–{r.hi} MHz · {r.orbit}
                      </p>
                      <p className="text-sm">
                        <strong>Finland visibility:</strong>{" "}
                        {r.id === "DEMO-05"
                          ? "Below horizon at example samples only; national coverage unresolved."
                          : "Not established in this synthetic scenario; expert confirmation required."}
                      </p>
                      <p className="text-sm text-muted-foreground">{r.evidence}</p>
                      <p className="text-sm">
                        <strong>Next check:</strong> {r.next}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void changeState(
                            r.id,
                            (reviews[r.id] ?? "unreviewed") === "completed"
                              ? "unreviewed"
                              : "completed",
                          )
                        }
                      >
                        <CheckCircle2 />
                        {reviews[r.id] === "completed" ? "Reopen review" : "Complete review"}
                      </Button>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul>
            {paginated.rows.map((item) =>
              item.kind === "synthetic" ? (
                <SyntheticSpaceRecord
                  key={item.record.id}
                  row={item.record}
                  state={syntheticReviews[item.record.id] ?? "unreviewed"}
                  onState={changeSyntheticState}
                />
              ) : (
                <RecordCard
                  key={item.record.noticeId}
                  r={item.record}
                  forcedOpen={active === item.record.noticeId}
                  workflow={reviews[item.record.noticeId] ?? "unreviewed"}
                  onState={(id, s) => void changeState(id, s)}
                />
              ),
            )}
          </ul>
        )}
        {!demo && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {visibleCount ? paginated.current * 25 + 1 : 0}–
              {Math.min((paginated.current + 1) * 25, visibleCount)} of {visibleCount}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous Space page"
                disabled={paginated.current === 0}
                onClick={() => setPage(paginated.current - 1)}
              >
                <ChevronLeft />
              </Button>
              <span className="text-sm">
                {paginated.current + 1} / {paginated.pages}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next Space page"
                disabled={paginated.current === paginated.pages - 1}
                onClick={() => setPage(paginated.current + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
        {visibleCount === 0 && <p className="py-6 text-muted-foreground">No matching filings.</p>}
        <details className="mt-6 text-xs text-muted-foreground">
          <summary className="cursor-pointer">How results are produced</summary>
          <p className="mt-2">
            {pfdMeta.method}. {pfdMeta.scope}. Non-GSO filings need time-based EPFD simulation and
            are listed as not calculated.
          </p>
        </details>
      </>
    </section>
  );
}
