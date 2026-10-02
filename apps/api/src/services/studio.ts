import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PipelineRunner, loadProjectResume, readCheckpoint } from "@loom/agents";
import { createDatabaseClient, projects } from "@loom/database";
import { eq } from "drizzle-orm";
import { broadcastToProject } from "../ws/pipeline-stream.js";

export const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
export const workspaceRoot = (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid project ID");
  return path.join(repositoryRoot, "runs/workspaces", id);
};
export interface StudioEvent {
  id: string;
  type: string;
  at: string;
  data: Record<string, unknown>;
}
interface Session {
  projectId: string;
  phase: string;
  status: string;
  waiting: boolean;
  events: StudioEvent[];
  resolve?: (message: string) => void;
}
const sessions = new Map<string, Session>();
let active: string | undefined;
const db = createDatabaseClient(process.env.DATABASE_URL!);

export async function studioState(id: string) {
  const session = sessions.get(id);
  if (session) return { ...session, resolve: undefined };
  const saved = readCheckpoint(id, repositoryRoot);
  const events: StudioEvent[] = [];
  for (const [phase, messages] of Object.entries(saved?.chatHistory ?? {})) {
    for (const [index, message] of messages.entries())
      events.push({
        id: `${phase}-${index}`,
        type: message.role === "user" ? "user:message" : "agent:message",
        at: message.timestamp,
        data: { phase, message: message.content },
      });
  }
  return {
    projectId: id,
    phase: saved?.phase ?? "idea_check",
    status:
      saved?.status === "completed" && saved.phase === "code_gen"
        ? "completed"
        : saved
          ? "paused"
          : "idle",
    waiting: false,
    events,
  };
}
export function replyToSession(id: string, message: string) {
  const session = sessions.get(id);
  if (!session?.waiting || !session.resolve) return false;
  const resolve = session.resolve;
  session.resolve = undefined;
  session.waiting = false;
  emit(session, "user:message", { message, phase: session.phase });
  resolve(message);
  return true;
}
function emit(session: Session, type: string, input: unknown) {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  if (typeof raw.phase === "string") session.phase = raw.phase;
  if (typeof raw.currentPhase === "string") session.phase = raw.currentPhase;
  const data =
    type === "pipeline:progress"
      ? { phase: session.phase, status: session.status }
      : Object.fromEntries(
          Object.entries(raw).filter(([key]) =>
            ["message", "phase", "error", "finalPhase", "projectId", "status"].includes(key),
          ),
        );
  const event: StudioEvent = { id: crypto.randomUUID(), type, at: new Date().toISOString(), data };
  session.events.push(event);
  if (session.events.length > 500) session.events.splice(0, session.events.length - 500);
  broadcastToProject(session.projectId, "studio:event", event);
}
export async function startSession(id: string, idea: string, resume: boolean) {
  // The graph currently has global callbacks. Serialize runs to isolate user replies.
  if (active) return { conflict: active };
  active = id;
  try {
    const initialContext: Record<string, any> = resume
      ? await loadProjectResume(id, repositoryRoot)
      : { rawIdea: idea };
    const previous = await studioState(id);
    const session: Session = {
      projectId: id,
      phase: String(initialContext.resumePhase ?? "idea_check"),
      status: "running",
      waiting: false,
      events: previous.events,
    };
    sessions.set(id, session);
    const documentsDir = path.join(workspaceRoot(id), "uploads");
    const documents = await fs
      .readdir(documentsDir)
      .then((names) => names.map((name) => path.join(documentsDir, name)))
      .catch(() => [] as string[]);
    void PipelineRunner.run({
      projectId: id,
      initialContext,
      documents: resume ? (initialContext.resumeDocuments ?? []) : documents,
      interactive: true,
      onMessage: (type, data) => emit(session, type, data),
      waitForUserInput: () =>
        new Promise<string>((resolve) => {
          session.waiting = true;
          session.resolve = resolve;
          emit(session, "input:requested", { phase: session.phase });
        }),
    })
      .then(async (result) => {
        session.status = result.error ? "failed" : "completed";
        session.phase = result.currentPhase;
        await db
          .update(projects)
          .set({ status: session.status, updatedAt: new Date() })
          .where(eq(projects.id, id));
      })
      .catch((error) => {
        session.status = "failed";
        emit(session, "pipeline:error", { error: String(error) });
      })
      .finally(() => {
        session.waiting = false;
        session.resolve = undefined;
        active = undefined;
      });
    return { started: true };
  } catch (error) {
    active = undefined;
    throw error;
  }
}
