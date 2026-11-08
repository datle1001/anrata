import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { inboxEvent, readInbox, writeInbox, type InboxEntry } from "./publication-inbox";
import { cloudPublications } from "./publication-cloud.functions";
import { guestPublicationToken } from "./publication-access";
import { useSession } from "./oma/session";
import { supabase } from "@/integrations/supabase/client";

const pending = new Map<string, Promise<InboxEntry[]>>();
export function usePublicationInbox() {
  const [entries, setEntries] = useState<InboxEntry[]>([]);
  const cloud = useServerFn(cloudPublications);
  const user = useSession();
  useEffect(() => {
    let active = true;
    const refresh = () => setEntries(readInbox(localStorage));
    setEntries([]);
    const sync = async () => {
      const { data } = await supabase.auth.getSession();
      const scope = data.session?.user.id ?? "guest";
      const token = guestPublicationToken();
      let job = pending.get(scope);
      if (!job) {
        job = (async () => {
          let rows = await cloud({ data: { action: "list", token } });
          const marker = "antara:uploads-migrated:v1";
          if (scope === "guest" && !localStorage.getItem(marker)) {
            for (const entry of readInbox(localStorage)) {
              if (!rows.some((e) => e.sha256 === entry.sha256 || e.publication.issue === entry.publication.issue))
                rows = await cloud({ data: { action: "save", token, entry } });
            }
            localStorage.setItem(marker, "true");
          }
          return rows;
        })();
        pending.set(scope, job);
        void job.finally(() => pending.delete(scope)).catch(() => {});
      }
      const rows = await job;
      if (active) { writeInbox(rows); setEntries(rows); }
    };
    void sync().catch((error) => { if (active) toast.error("Cloud upload sync failed: " + (error instanceof Error ? error.message : "Please reload.")); });
    window.addEventListener("storage", refresh);
    window.addEventListener(inboxEvent, refresh);
    return () => {
      active = false;
      window.removeEventListener("storage", refresh);
      window.removeEventListener(inboxEvent, refresh);
    };
  }, [cloud, user?.id]);
  return entries;
}
