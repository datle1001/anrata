import { useState } from "react";
import { Download, Eye, FileText, LoaderCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildLetterDocx, saveBlob } from "@/lib/dossier-files";
import { reviseLetter } from "@/lib/letter-ai.functions";

/** Shared editable Word-letter dialog for real and synthetic Space filings. */
export function LetterDialog({
  title,
  fileName,
  letter,
  setLetter,
  reset,
  open,
  onOpenChange,
}: {
  title: string;
  fileName: string;
  letter: string;
  setLetter: (s: string) => void;
  reset: () => string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [instr, setInstr] = useState("");
  const [busy, setBusy] = useState(false);
  const revise = useServerFn(reviseLetter);
  const askAi = async () => {
    if (!instr.trim()) return;
    setBusy(true);
    try {
      const res = await revise({ data: { letter, instruction: instr } });
      setLetter(res.letter);
      setInstr("");
      toast.success("AI revision applied — please re-read before approving.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI revision failed");
    } finally {
      setBusy(false);
    }
  };
  const docx = async () => {
    saveBlob(await buildLetterDocx(letter), fileName);
    toast.success("Word letter downloaded", {
      description: "Add the diary number, then export the signed PDF.",
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Letter — {title}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "preview" ? "default" : "outline"}
            onClick={() => setMode("preview")}
          >
            <Eye />
            Preview
          </Button>
          <Button
            size="sm"
            variant={mode === "edit" ? "default" : "outline"}
            onClick={() => setMode("edit")}
          >
            <FileText />
            Edit myself
          </Button>
        </div>
        {mode === "preview" ? (
          <pre className="whitespace-pre-wrap rounded-md border border-border bg-card p-6 font-serif text-sm leading-relaxed">
            {letter}
          </pre>
        ) : (
          <Textarea
            className="min-h-[420px] font-mono text-xs"
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            aria-label="Edit letter"
          />
        )}
        <div className="rounded-md border border-border p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-accent" />
            Ask AI to revise
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Make it shorter, add a request for coordination"
              value={instr}
              onChange={(e) => setInstr(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askAi()}
            />
            <Button onClick={askAi} disabled={busy || !instr.trim()}>
              {busy ? <LoaderCircle className="motion-safe:animate-spin" /> : "Revise"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            AI only rewrites wording; it is told not to change or add technical figures.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => setLetter(reset())}>
            Reset
          </Button>
          <Button onClick={docx}>
            <Download />
            Download Word (.docx)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
