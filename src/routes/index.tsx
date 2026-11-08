import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Satellite, TowerControl } from "lucide-react";
import { AntaraWord } from "@/components/antara-identity";
import spectrumScene from "@/assets/nordic-spectrum.jpg";
import { Button } from "@/components/ui/button";
import { TerrestrialEvidence } from "@/components/terrestrial-evidence";
import { NoticeRecords } from "@/components/notice-records";
import { OmaFloating } from "@/components/oma-floating";
import { type WorkspaceCommand } from "@/lib/oma/workspace";
import { CompactHeader } from "@/components/compact-header";
import { SubmissionEvidence } from "@/components/submission-evidence";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Antara · IFIC Review Desk with Oma" },
      {
        name: "description",
        content:
          "One review desk for Space IFIC 3074 and Terrestrial IFIC 3076 filings that may affect Finnish frequencies.",
      },
      { property: "og:title", content: "Antara · IFIC Review Desk with Oma" },
      {
        property: "og:description",
        content:
          "Review stored Space and land-mobile evidence, inspect assumptions and sources, and prepare expert-approved correspondence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function Index() {
  const [pub, setPub] = useState<"space" | "terrestrial">("space");
  const [omaOpen, setOmaOpen] = useState(false);
  const [command, setCommand] = useState<{ value: WorkspaceCommand; seq: number } | null>(null);
  const [workspace, setWorkspace] = useState<unknown>({ publication: "space" });
  useEffect(() => {
    if (localStorage.getItem("antara:publication-tab") === "terrestrial") setPub("terrestrial");
  }, []);
  const selectPublication = (value: "space" | "terrestrial") => {
    setPub(value);
    localStorage.setItem("antara:publication-tab", value);
    setWorkspace({ publication: value });
  };
  const control = (c: WorkspaceCommand) => {
    if (c.publication) selectPublication(c.publication);
    setCommand((old) => ({ value: c, seq: (old?.seq ?? 0) + 1 }));
    return { publication: c.publication ?? pub, command: c };
  };
  return (
    <main className="desk-surface min-h-screen text-foreground">
      <CompactHeader onOma={() => setOmaOpen(!omaOpen)} />
      <section className="desk-introduction" aria-label="Antara spectrum intelligence">
        <img
          className="introduction-photo"
          src={spectrumScene}
          alt="Satellite ground station under the northern night sky"
          width={1920}
          height={1024}
        />
        <div className="desk-masthead">
          <div className="max-w-lg">
            <p className="mb-4 text-xs font-medium text-secondary">
              FINLAND / SPECTRUM INTELLIGENCE
            </p>
            <h1 className="brand-name">
              <AntaraWord />
            </h1>
            <p className="mt-5 text-lg text-foreground">International frequency review</p>
            <p className="mt-2 text-sm text-muted-foreground">Stored evidence. Expert decisions.</p>
          </div>
        </div>
      </section>
      <div id="review-desk" className="review-workspace">
        <div className="min-w-0">
          <SubmissionEvidence />
          <nav aria-label="Publication" className="publication-tabs flex flex-wrap gap-3">
            <Button
              variant={pub === "space" ? "default" : "outline"}
              aria-pressed={pub === "space"}
              onClick={() => selectPublication("space")}
            >
              <Satellite />
              Space IFIC 3074
            </Button>
            <Button
              variant={pub === "terrestrial" ? "default" : "outline"}
              aria-pressed={pub === "terrestrial"}
              onClick={() => selectPublication("terrestrial")}
            >
              <TowerControl />
              Terrestrial IFIC 3076
            </Button>
          </nav>
          {pub === "space" ? (
            <NoticeRecords command={command} onWorkspace={setWorkspace} />
          ) : (
            <TerrestrialEvidence />
          )}
        </div>
        <OmaFloating
          open={omaOpen}
          setOpen={setOmaOpen}
          onCommand={control}
          workspace={workspace}
        />
      </div>
    </main>
  );
}
