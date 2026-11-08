import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const kits = [
  {
    title: "Space test files",
    zip: "ANRATA_Space_Test_Files.zip",
    folder: "space",
    files: ["IFIC_3077_demo_full.json", "IFIC_3081_demo_full.json", "IFIC_3082_demo_full.json"],
    hint: "Upload 3077, then 3081, then 3082 — BALTIC-STREAM in 3082 shows Changes against 3081.",
  },
  {
    title: "Terrestrial test files",
    zip: "ANRATA_Terrestrial_Test_Files.zip",
    folder: "terrestrial",
    files: [
      "IFIC_3083_terrestrial_demo.json",
      "IFIC_3084_terrestrial_demo.json",
      "IFIC_3085_terrestrial_demo.json",
      "IFIC_3076_terrestrial_p1546_demo.json",
    ],
    hint: "Upload 3083 → 3084 → 3085 to see Changes; 3076 shows a stored P.1546 assessment.",
  },
] as const;

export function DemoTestFiles() {
  return (
    <section className="mt-6 rounded-md border border-border p-4" aria-label="Demo test files">
      <h2 className="text-sm font-semibold">Synthetic demo files for judges</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Download, then upload them here in the order shown. All files are marked synthetic.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {kits.map((kit) => (
          <div key={kit.zip} className="min-w-0">
            <h3 className="text-sm font-semibold">{kit.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{kit.hint}</p>
            <Button className="mt-3" size="sm" asChild>
              <a href={`/demo-files/${kit.zip}`} download={kit.zip}>
                <Download />
                Download all ({kit.files.length}) .zip
              </a>
            </Button>
            <ul className="mt-2 space-y-1 text-xs">
              {kit.files.map((f) => (
                <li key={f}>
                  <a
                    className="text-chart-1 underline break-all"
                    href={`/demo-files/${kit.folder}/${f}`}
                    download={f}
                  >
                    {f}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
