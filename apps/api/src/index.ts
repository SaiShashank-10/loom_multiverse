import { serve } from "@hono/node-server";
import { createLogger } from "@loom/shared/logger";
import { repositoryRoot } from "./services/studio.js";
import { app } from "./app.js";
process.chdir(repositoryRoot);
const log = createLogger("api-server");
const port = parseInt(process.env.LOOM_API_PORT || "3001", 10);

log.info(`Starting API server on port ${port}...`);

import { setupWebSocketServer } from "./ws/pipeline-stream.js";
import { Server } from "http";

// Create underlying Node HTTP server
const server = serve({
  fetch: app.fetch,
  port,
  hostname: "127.0.0.1",
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
