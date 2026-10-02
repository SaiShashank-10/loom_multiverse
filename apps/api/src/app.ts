import { Hono } from "hono";
import { cors } from "hono/cors";

import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";

import { artifactsRouter } from "./routes/artifacts.js";
import { authRouter, type AuthEnv } from "./routes/auth.js";
import { requireAccount } from "./middleware/auth.js";

export const app = new Hono<AuthEnv>();

// Global Middlewares
const allowedOrigins = [
  "http://127.0.0.1:5174",
  "http://localhost:5174",
  "http://127.0.0.1:3001",
  "http://localhost:3001",
];
app.use("*", async (c, next) => {
  const origin = c.req.header("Origin");
  if (origin && !allowedOrigins.includes(origin))
    return c.json({ success: false, error: { message: "Origin not allowed" } }, 403);
  return next();
});
app.use("*", cors({ origin: allowedOrigins }));
app.use("*", requestLogger);
app.onError(errorHandler);

import { healthRouter } from "./routes/health.js";
import { projectsRouter } from "./routes/projects.js";
import { pipelineRouter } from "./routes/pipeline.js";
import { feedRouter } from "./routes/feed.js";

// Mount Routers
app.route("/health", healthRouter);
app.route("/auth", authRouter);
app.use("/projects", requireAccount);
app.use("/projects/*", requireAccount);
app.use("/pipeline/*", requireAccount);
app.use("/feed/*", requireAccount);
app.route("/projects", projectsRouter);
app.route("/pipeline", pipelineRouter);
app.route("/feed", feedRouter);
app.route("/projects", artifactsRouter);
