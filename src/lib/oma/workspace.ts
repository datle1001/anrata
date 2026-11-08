export type WorkspaceCommand = {
  publication: "space" | "terrestrial" | null;
  status: string | null;
  query: string | null;
  workflow: string | null;
  sort: string | null;
  filingId: string | null;
  demo: boolean | null;
};
export const allowedStatuses = ["all", "exceeds", "near-limit", "within", "not-calculable"];
export const allowedWorkflow = ["all", "unreviewed", "in-review", "completed"];
export function validateCommand(input: WorkspaceCommand): WorkspaceCommand {
  if (input.workflow === "unread") input = { ...input, workflow: "unreviewed" };
  if (input.publication && !["space", "terrestrial"].includes(input.publication))
    throw new Error("Unknown publication");
  if (input.status && !allowedStatuses.includes(input.status))
    throw new Error("Unknown screening filter");
  if (input.workflow && !allowedWorkflow.includes(input.workflow))
    throw new Error("Unknown workflow filter");
  if (input.sort && !["risk", "low", "stations"].includes(input.sort))
    throw new Error("Unknown sort");
  return input;
}
export function overlap(low: number, high: number, lo: number, hi: number) {
  return high > lo && low < hi;
}
