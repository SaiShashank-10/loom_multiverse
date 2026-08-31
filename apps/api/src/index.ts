import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createLogger } from "@loom/shared/logger";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler } from "./middleware/error-handler.js";

const log = createLogger("api-server");

const app = new Hono();

// Global Middlewares
app.use("*", cors({
  origin: "*", // For now, allow all. We can restrict this in Phase D
}));
app.use("*", requestLogger);
app.onError(errorHandler);

import { healthRouter } from "./routes/health.js";
import { projectsRouter } from "./routes/projects.js";
import { pipelineRouter } from "./routes/pipeline.js";
import { feedRouter } from "./routes/feed.js";

// Mount Routers
app.route("/health", healthRouter);
app.route("/projects", projectsRouter);
app.route("/pipeline", pipelineRouter);
app.route("/feed", feedRouter);

const port = parseInt(process.env.PORT || "3000", 10);

log.info(`Starting API server on port ${port}...`);

import { setupWebSocketServer } from "./ws/pipeline-stream.js";
import { Server } from "http";

// Create underlying Node HTTP server
const server = serve({
  fetch: app.fetch,
  port
});

// Attach WebSocket Server for pipeline streaming
const wss = setupWebSocketServer(server as Server);

// Graceful Shutdown Handler
const shutdown = () => {
  log.info("Shutting down API server gracefully...");
  
  wss.close(() => {
    log.info("WebSocket server closed.");
  });

  
  // The serve() function returns an http.Server instance
  (server as any).close(() => {
    log.info("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
