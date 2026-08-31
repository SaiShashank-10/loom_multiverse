import { Hono } from "hono";
import { PipelineRunner } from "@loom/agents";
import { createDatabaseClient, projects } from "@loom/database";
import { eq } from "drizzle-orm";
import { NotFoundError } from "@loom/shared/errors";
import { createLogger } from "@loom/shared/logger";

const log = createLogger("api-pipeline");
const pipelineRouter = new Hono();
const db = createDatabaseClient(process.env.DATABASE_URL!);

import { broadcastToProject } from "../ws/pipeline-stream.js";

// POST /pipeline/:projectId/start
pipelineRouter.post("/:projectId/start", async (c) => {
  const projectId = c.req.param("projectId");
  
  // Verify project exists
  const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project || project.length === 0) {
    throw new NotFoundError("Project", projectId);
  }

  // Update status to starting
  await db.update(projects)
    .set({ status: "idea_check" })
    .where(eq(projects.id, projectId));

  // Run in background (do not await)
  PipelineRunner.run({ 
    projectId,
    onProgress: (event, data) => {
      broadcastToProject(projectId, event, data);
    }
  }).catch(error => {
    log.error({ projectId, error: String(error) }, "Background pipeline execution failed");
    broadcastToProject(projectId, "pipeline:error", { error: String(error) });
  });
  
  return c.json({ 
    success: true, 
    message: "Pipeline started in background",
    data: { projectId } 
  }, 202); // 202 Accepted
});

export { pipelineRouter };
