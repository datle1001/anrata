import { useEffect, useState } from "react";
import { detailReadEvent, detailReadKey, readDetailViews } from "@/lib/detail-review";
import { toast } from "sonner";

export function useDetailRead(id: string) {
  const [viewedAt, setViewedAt] = useState<string>();
  useEffect(() => {
    const refresh = () => setViewedAt(readDetailViews(localStorage)[id]);
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(detailReadEvent, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(detailReadEvent, refresh);
    };
  }, [id]);
  const markRead = () => {
    try {
      const views = readDetailViews(localStorage);
      const at = views[id] ?? new Date().toISOString();
      localStorage.setItem(detailReadKey, JSON.stringify({ ...views, [id]: at }));
      setViewedAt(at);
      window.dispatchEvent(new Event(detailReadEvent));
    } catch {
      toast.error("Read status could not be saved in this browser.");
    }
  };
  return { viewedAt, markRead };
}
