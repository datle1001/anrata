import { Bell, CheckCircle2, LoaderCircle, ScanLine, Satellite, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { loading: boolean; completed: boolean; imported: boolean; onScan: () => void };

export function PublicationScan({ loading, completed, imported, onScan }: Props) {
  return <section aria-label="Available IFIC publications" className="mt-7 border-y border-border bg-muted/40 py-6">
    <div className="flex flex-wrap items-start justify-between gap-5">
      <div className="flex min-w-0 items-start gap-3">
        <Bell className="mt-1 size-5 shrink-0 text-secondary" />
        <div><p className="text-xs font-semibold tracking-normal text-secondary">PUBLICATION INBOX</p>
          <h2 className="mt-2 text-xl font-semibold">2 IFIC publications available</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Provided challenge files · offline screening evidence · live ITU monitoring not connected</p>
        </div>
      </div>
      <Button size="lg" disabled={loading} onClick={onScan} className="w-full sm:w-auto">
        {loading ? <LoaderCircle className="motion-safe:animate-spin" /> : completed && !imported ? <CheckCircle2 /> : <ScanLine />}
        {loading ? "Loading screening evidence…" : completed ? "Scan again" : "Scan filings"}
      </Button>
    </div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {[{ Icon: Satellite, name: "Space", issue: "3074", source: "Space IFIC 3074", detail: "131 frequency-overlap notices" }, { Icon: Radio, name: "Terrestrial", issue: "3076", source: "brific3076.mdb", detail: "1,858 foreign land-mobile publication rows" }].map(({ Icon, name, issue, source, detail }) =>
        <div key={issue} className="flex min-w-0 items-start gap-3 border-l-2 border-secondary/40 pl-4">
          <Icon className="mt-1 size-5 shrink-0 text-accent" />
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="font-medium">{name} IFIC {issue}</h3><span className="text-xs text-secondary">{loading ? "Loading" : completed && !imported ? "Evidence loaded" : "Ready"}</span></div><p className="mt-1 break-words font-mono text-xs text-muted-foreground">{source}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p></div>
        </div>)}
    </div>
    <p role="status" aria-live="polite" className="mt-5 text-xs text-muted-foreground">{loading ? "Reading the prepared review artifact; no new propagation calculations are running." : completed && !imported ? "Screening evidence loaded. Review labels are not confirmed interference-risk levels." : imported ? "An imported review artifact is active. Scan again to restore the provided publications." : "Scan loads existing offline results. Regulatory exceedances and safe filings have not been established."}</p>
  </section>;
}