import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDatabaseClient, projects } from "@loom/database";
import { eq } from "drizzle-orm";
import { studioState, startSession, replyToSession } from "../services/studio.js";
import { savedProject } from "../services/saved-projects.js";
import type { AuthEnv } from "./auth.js";

const pipelineRouter = new Hono<AuthEnv>();
const db = createDatabaseClient(process.env.DATABASE_URL!);
pipelineRouter.use("/:projectId/*", async (c, next) => {
  if (!z.string().uuid().safeParse(c.req.param("projectId")).success)
    return c.json({ success: false, error: { message: "Invalid project ID" } }, 400);
  return next();
});
pipelineRouter.get("/:projectId/state", async (c) =>
  c.json({ success: true, data: await studioState(c.req.param("projectId")) }),
);
for (const action of ["start", "resume"] as const)
  pipelineRouter.post(`/:projectId/${action}`, async (c) => {
    const id = c.req.param("projectId");
    let [project] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!project) {
      const saved = await savedProject(id);
      if (saved) {
        await db.insert(projects).values({...saved,ownerId:c.get("user").id}).onConflictDoNothing();
        [project] = await db.select().from(projects).where(eq(projects.id,id)).limit(1);
      }
    }
    if (!project) return c.json({ success: false, error: { message: "Project not found" } }, 404);
    const state = await studioState(id);
    if (action === "start" && state.status !== "idle")
      return c.json(
        {
          success: false,
          error: { message: "This project has saved work. Use Resume to continue it." },
        },
        409,
      );
    try {
      const result = await startSession(id, project.founderPrompt, action === "resume");
      if (result.conflict)
        return c.json(
          {
            success: false,
            error: {
              message:
                "Another pipeline is already active. Finish its conversation before starting a new one.",
            },
          },
          409,
        );
      return c.json({ success: true, data: { projectId: id } }, 202);
    } catch (error) {
      return c.json(
        {
          success: false,
          error: { message: error instanceof Error ? error.message : "Unable to resume project" },
        },
        422,
      );
    }
  });
pipelineRouter.post(
  "/:projectId/message",
  zValidator("json", z.object({ message: z.string().trim().min(1).max(20000) })),
  (c) => {
    if (!replyToSession(c.req.param("projectId"), c.req.valid("json").message))
      return c.json(
        {
          success: false,
          error: {
            message:
              "The agent is not waiting for a reply. Refresh the conversation and try again.",
          },
        },
        409,
      );
    return c.json({ success: true, data: { accepted: true } });
  },
);
export { pipelineRouter };
