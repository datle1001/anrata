import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const reviseLetter = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ letter: z.string().min(1).max(20000), instruction: z.string().min(1).max(2000) }).parse(i))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: "You edit formal ITU spectrum-coordination letters from the Finnish administration (Traficom). Apply only the requested change. Keep the letter structure, references, numbers and facts. Never invent technical values, exceedances or findings. Return only the full revised letter text, no commentary.",
        input: `Instruction: ${data.instruction}\n\nLetter:\n${data.letter}`,
      }),
    });
    if (res.status === 429) throw new Error("AI is busy, please retry in a moment");
    if (res.status === 402) throw new Error("AI credits exhausted");
    if (!res.ok || !res.body) throw new Error(`AI request failed (${res.status})`);
    const reader = res.body.getReader(); const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        const p = l.slice(5).trim(); if (!p || p === "[DONE]") continue;
        try { const e = JSON.parse(p); if (e.type === "response.output_text.delta") out += e.delta; } catch { /* ignore */ }
      }
    }
    if (!out.trim()) throw new Error("AI returned no text");
    return { letter: out.trim() };
  });
