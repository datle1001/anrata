import { Link } from "@tanstack/react-router";
import { Inbox, ArrowLeft } from "lucide-react";
import { AntaraWord } from "@/components/antara-identity";
import { OmaName } from "@/components/oma-identity";
import { Button } from "@/components/ui/button";
import { usePublicationInbox } from "@/lib/use-publication-inbox";
export function CompactHeader({ portal = false, onOma }: { portal?: boolean; onOma?: () => void }) {
  const pending = usePublicationInbox()
    .filter((e) => !e.transferred)
    .reduce((n, e) => n + e.publication.filings.length, 0);
  return (
    <header className="desk-header sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border px-4 sm:px-6">
      <span className="brand-name text-xl font-semibold">
        <AntaraWord />
      </span>
      <span className="hidden text-xs text-muted-foreground sm:block">
        {portal ? "Publication portal · simulation" : "Spectrum review desk"}
      </span>
      <Button asChild size="sm" variant="ghost" className="ml-auto">
        <Link to={portal ? "/" : "/publications"}>
          {portal ? <ArrowLeft /> : <Inbox />}
          {portal ? "Review desk" : `Inbox${pending ? ` · ${pending} new` : ""}`}
        </Link>
      </Button>
      {onOma && (
        <Button
          size="sm"
          variant="outline"
          onClick={onOma}
          aria-label="Open Oma"
          className="h-10"
        >
          <OmaName className="text-base font-semibold" />
        </Button>
      )}
    </header>
  );
}
