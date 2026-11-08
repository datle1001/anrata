import type { UIMessage } from "ai";

export function currentQuestion(messages: UIMessage[]) {
  const latestUser = [...messages].reverse().find((message) => message.role === "user");
  return latestUser?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n") ?? "";
}

// A UIMessage contains its own tool calls/results. Begin on a user turn.
export function recentContext(messages: UIMessage[]) {
  let start = Math.max(0, messages.length - 6);
  while (start < messages.length && messages[start]?.role !== "user") start++;
  return messages.slice(start);
}
export function matchesAdministration(actual: string | undefined, requested: string | null) {
  return !requested || (actual ?? "").trim().toUpperCase() === requested.trim().toUpperCase();
}
