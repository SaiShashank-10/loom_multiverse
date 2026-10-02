import fs from "node:fs";
import path from "node:path";
import type { ChatMessage } from "../agents/types.js";
export const phases = [
  "document_ingestion",
  "idea_check",
  "planning",
  "stitch",
  "code_gen",
] as const;
export type Phase = (typeof phases)[number];
export interface Checkpoint {
  version: 1;
  projectId: string;
  phase: Phase;
  status: "running" | "failed" | "completed";
  context: Record<string, unknown>;
  chatHistory: Record<string, ChatMessage[]>;
  documents: string[];
}
export function checkpointPath(id: string, cwd = process.cwd()) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid project ID");
  return path.join(cwd, "runs", "workspaces", id, "pipeline-checkpoint.json");
}
export function saveCheckpoint(checkpoint: Checkpoint, cwd = process.cwd()) {
  const target = checkpointPath(checkpoint.projectId, cwd);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(checkpoint, null, 2));
  fs.renameSync(temporary, target);
}
export function readCheckpoint(id: string, cwd = process.cwd()): Checkpoint | null {
  const target = checkpointPath(id, cwd);
  if (!fs.existsSync(target)) return null;
  const value = JSON.parse(fs.readFileSync(target, "utf8"));
  if (
    value.version !== 1 ||
    value.projectId !== id ||
    !phases.includes(value.phase) ||
    !["running", "failed", "completed"].includes(value.status) ||
    !value.context ||
    !value.chatHistory ||
    !Array.isArray(value.documents)
  )
    throw new Error("Invalid saved pipeline checkpoint; refusing to restart from scratch");
  return value;
}
