import { Hono } from "hono";
import { createDatabaseClient } from "@loom/database";
import { sql } from "drizzle-orm";

const healthRouter = new Hono();
const db = createDatabaseClient(process.env.DATABASE_URL!);

healthRouter.get("/", async (c) => {
  try {
    // Ping DB
    await db.execute(sql`SELECT 1`);
    
    return c.json({
      success: true,
      data: {
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: "HEALTH_CHECK_FAILED",
        message: "Database connection failed",
        details: String(error)
      }
    }, 503);
  }
});

export { healthRouter };
