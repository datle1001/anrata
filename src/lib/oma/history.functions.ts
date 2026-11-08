import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const resetOmaHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("oma_conversations")
      .upsert({ user_id: context.userId, messages: [], updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { saved: true };
  });
export const getOmaHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("oma_conversations")
      .select("messages")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.messages ?? [];
  });
export const recordOmaAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ action: z.string(), evidence: z.record(z.unknown()) }).parse(v))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("oma_audit").insert({
      user_id: context.userId,
      action: data.action,
      evidence: JSON.parse(JSON.stringify(data.evidence)),
    });
    if (error) throw new Error(error.message);
    return { saved: true };
  });
