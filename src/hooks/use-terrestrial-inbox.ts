import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { terrestrialCloud } from "@/lib/terrestrial-cloud.functions";
import { guestPublicationToken } from "@/lib/publication-access";
import { terrestrialInboxEvent, type TerrestrialUploadEntry } from "@/lib/terrestrial-upload";
import { useSession } from "@/lib/oma/session";

export function useTerrestrialInbox() {
  const [entries, setEntries] = useState<TerrestrialUploadEntry[]>([]);
  const [error, setError] = useState("");
  const cloud = useServerFn(terrestrialCloud);
  const user = useSession();
  const refresh = useCallback(async () => {
    try {
      setEntries(
        JSON.parse(await cloud({ data: { action: "list", token: guestPublicationToken() } })),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cloud evidence unavailable.");
    }
  }, [cloud]);
  useEffect(() => {
    setEntries([]);
    void refresh();
    const listener = () => void refresh();
    window.addEventListener(terrestrialInboxEvent, listener);
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener(terrestrialInboxEvent, listener);
      window.removeEventListener("storage", listener);
    };
  }, [refresh, user?.id]);
  return { entries, setEntries, error, refresh };
}
