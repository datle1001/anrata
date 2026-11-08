import { useEffect, useRef, useState, type PointerEvent as RPE } from "react";
import { OmaLogo } from "@/components/oma-identity";
import { Button } from "@/components/ui/button";
import { OmaPanel } from "@/components/oma-panel";
import type { WorkspaceCommand } from "@/lib/oma/workspace";

type Box = { x: number; y: number; w: number; h: number };
const KEY = "antara.oma.window";
const MIN_W = 320;
const MIN_H = 360;

function clamp(b: Box): Box {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(Math.max(b.w, MIN_W), vw);
  const h = Math.min(Math.max(b.h, MIN_H), vh);
  return { w, h, x: Math.min(Math.max(b.x, 0), vw - w), y: Math.min(Math.max(b.y, 0), vh - h) };
}

export function OmaFloating({
  open,
  setOpen,
  onCommand,
  workspace,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onCommand: (c: WorkspaceCommand) => unknown;
  workspace: unknown;
}) {
  const [box, setBox] = useState<Box | null>(null);
  const [minimized, setMinimized] = useState(false);
  const drag = useRef<{ mode: string; sx: number; sy: number; start: Box } | null>(null);

  useEffect(() => {
    let saved: Box | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      saved = null;
    }
    const w = Math.min(420, window.innerWidth - 16);
    const h = Math.min(620, window.innerHeight - 32);
    setBox(clamp(saved ?? { w, h, x: window.innerWidth - w - 24, y: window.innerHeight - h - 24 }));
    const onResize = () => setBox((b) => (b ? clamp(b) : b));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (box) localStorage.setItem(KEY, JSON.stringify(box));
  }, [box]);

  const begin = (mode: string) => (e: RPE) => {
    if (!box || e.button !== 0) return;
    e.preventDefault();
    drag.current = { mode, sx: e.clientX, sy: e.clientY, start: box };
    const move = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.sx;
      const dy = ev.clientY - d.sy;
      const s = d.start;
      let n = { ...s };
      if (d.mode === "move") n = { ...s, x: s.x + dx, y: s.y + dy };
      else {
        if (d.mode.includes("e")) n.w = s.w + dx;
        if (d.mode.includes("s")) n.h = s.h + dy;
        if (d.mode.includes("w")) {
          n.w = Math.max(MIN_W, s.w - dx);
          n.x = s.x + s.w - n.w;
        }
        if (d.mode.includes("n")) {
          n.h = Math.max(MIN_H, s.h - dy);
          n.y = s.y + s.h - n.h;
        }
      }
      setBox(clamp(n));
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!box) return null;
  if (!open || minimized)
    return (
      <Button
        type="button"
        aria-label="Open Oma"
        className="oma-bubble grid size-14 place-items-center text-primary"
        onClick={() => {
          setMinimized(false);
          setOpen(true);
        }}
      >
        <OmaLogo className="size-10" />
      </Button>
    );

  const corners: [string, string][] = [
    ["nw", "left-0 top-0 cursor-nwse-resize"],
    ["ne", "right-0 top-0 cursor-nesw-resize"],
    ["sw", "left-0 bottom-0 cursor-nesw-resize"],
    ["se", "right-0 bottom-0 cursor-nwse-resize"],
  ];
  return (
    <div className="oma-float" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
      <OmaPanel
        onClose={() => setOpen(false)}
        onMinimize={() => setMinimized(true)}
        onDragStart={begin("move")}
        onCommand={onCommand}
        workspace={workspace}
      />
      {corners.map(([m, cls]) => (
        <div
          key={m}
          aria-hidden
          className={`oma-handle touch-none ${cls}`}
          onPointerDown={begin(m)}
        />
      ))}
    </div>
  );
}
