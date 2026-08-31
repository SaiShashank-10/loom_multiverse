import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { createDatabaseClient, feedItems } from "@loom/database";
import { eq, desc } from "drizzle-orm";
import { DatabaseError } from "@loom/shared/errors";

const feedRouter = new Hono();
const db = createDatabaseClient(process.env.DATABASE_URL!);

const querySchema = z.object({
  limit: z.string().optional().default("20").transform((v) => parseInt(v, 10)),
  offset: z.string().optional().default("0").transform((v) => parseInt(v, 10)),
});

// GET /feed/:projectId
feedRouter.get("/:projectId", zValidator("query", querySchema), async (c) => {
  const projectId = c.req.param("projectId");
  const { limit, offset } = c.req.valid("query");
  
  try {
    const items = await db.select()
      .from(feedItems)
      .where(eq(feedItems.projectId, projectId))
      .orderBy(desc(feedItems.relevanceScore), desc(feedItems.publishedAt))
      .limit(limit)
      .offset(offset);
      
    return c.json({ success: true, data: items, meta: { limit, offset } });
  } catch (error) {
    throw new DatabaseError("Failed to fetch feed items", { projectId, originalError: String(error) });
  }
});

export { feedRouter };
