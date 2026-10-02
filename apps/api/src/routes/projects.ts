import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDatabaseClient, projects } from "@loom/database";
import { eq, desc } from "drizzle-orm";
import { NotFoundError, DatabaseError } from "@loom/shared/errors";
import { createLogger } from "@loom/shared/logger";
import { savedProject, savedProjects } from "../services/saved-projects.js";
import type { AuthEnv } from "./auth.js";

const log = createLogger("api-projects");
const projectsRouter = new Hono<AuthEnv>();
const db = createDatabaseClient(process.env.DATABASE_URL!);

// Zod schemas
const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  description: z.string().trim().min(1, "Description is required").max(25000),
  founderPrompt: z.string().trim().min(1, "Founder prompt is required").max(25000),
});

// GET /projects
projectsRouter.get("/", async (c) => {
  try {
    const user = c.get("user");
    const allProjects = await db.select().from(projects).where(eq(projects.ownerId,user.id)).orderBy(desc(projects.createdAt));
    const registered = user.workspaceOwner ? await db.select({id:projects.id,ownerId:projects.ownerId}).from(projects) : [];
    const otherIds = new Set(registered.filter(p=>p.ownerId!==user.id).map(p=>p.id));
    const saved = user.workspaceOwner ? (await savedProjects()).filter(p=>!otherIds.has(p.id)) : [];
    const ids = new Set(allProjects.map((p) => p.id));
    const checkpoints = new Map(saved.map((p) => [p.id, p]));
    const current = allProjects.map((p) => {
      const checkpoint = checkpoints.get(p.id);
      return checkpoint
        ? {
            ...p,
            status: checkpoint.status,
            updatedAt: checkpoint.updatedAt > p.updatedAt ? checkpoint.updatedAt : p.updatedAt,
          }
        : p;
    });
    return c.json({
      success: true,
      data: [...current, ...saved.filter((p) => !ids.has(p.id))].sort(
        (a, b) => +b.updatedAt - +a.updatedAt,
      ),
    });
  } catch (error) {
    throw new DatabaseError("Failed to fetch projects", { originalError: String(error) });
  }
});

// GET /projects/:id
projectsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!z.string().uuid().safeParse(id).success)
    return c.json({ success: false, error: { message: "Invalid project ID" } }, 400);
  try {
    const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

    if (!project || project.length === 0) {
      const saved = await savedProject(id);
      if (saved) return c.json({ success: true, data: saved });
      throw new NotFoundError("Project", id);
    }

    const checkpoint = await savedProject(id);
    return c.json({
      success: true,
      data: checkpoint ? { ...project[0], status: checkpoint.status } : project[0],
    });
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError("Failed to fetch project", {
      projectId: id,
      originalError: String(error),
    });
  }
});

// POST /projects
projectsRouter.post("/", zValidator("json", createProjectSchema), async (c) => {
  const body = c.req.valid("json");

  try {
    const newProject = await db
      .insert(projects)
      .values({
        ownerId: c.get("user").id,
        name: body.name,
        description: body.description,
        founderPrompt: body.founderPrompt,
        status: "idea_check",
      })
      .returning();

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
