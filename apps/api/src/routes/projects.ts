import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDatabaseClient, projects } from "@loom/database";
import { eq, desc } from "drizzle-orm";
import { NotFoundError, DatabaseError } from "@loom/shared/errors";
import { createLogger } from "@loom/shared/logger";

const log = createLogger("api-projects");
const projectsRouter = new Hono();
const db = createDatabaseClient(process.env.DATABASE_URL!);

// Zod schemas
const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().min(1, "Description is required"),
  founderPrompt: z.string().min(1, "Founder prompt is required"),
});

// GET /projects
projectsRouter.get("/", async (c) => {
  try {
    const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));
    return c.json({ success: true, data: allProjects });
  } catch (error) {
    throw new DatabaseError("Failed to fetch projects", { originalError: String(error) });
  }
});

// GET /projects/:id
projectsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    
    if (!project || project.length === 0) {
      throw new NotFoundError("Project", id);
    }
    
    return c.json({ success: true, data: project[0] });
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to fetch project", { projectId: id, originalError: String(error) });
  }
});

// POST /projects
projectsRouter.post("/", zValidator("json", createProjectSchema), async (c) => {
  const body = c.req.valid("json");
  
  try {
    const newProject = await db.insert(projects).values({
      name: body.name,
      description: body.description,
      founderPrompt: body.founderPrompt,
      status: "idea_check"
    }).returning();
    
    const projectData = newProject[0];
    if (!projectData) {
      throw new DatabaseError("Failed to create project: no data returned");
    }
    
    log.info({ projectId: projectData.id }, "Created new project");
    
    return c.json({ success: true, data: projectData }, 201);
  } catch (error) {
    throw new DatabaseError("Failed to create project", { originalError: String(error) });
  }
});

export { projectsRouter };
