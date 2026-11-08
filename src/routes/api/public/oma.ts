import { createFileRoute } from "@tanstack/react-router";
import { handleOma } from "@/lib/oma/analyst.server";

export const Route = createFileRoute("/api/public/oma")({
  server: { handlers: { POST: ({ request }) => handleOma(request) } },
});
