import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { createLogger } from "@loom/shared/logger";
import { cookieToken, sessionAccount, canAccessProject } from "../services/accounts.js";

const log = createLogger("api-ws");

// A simple in-memory map of projectId -> Set of WebSocket connections
// In a scalable production app, this would be Redis Pub/Sub
const projectSubscribers = new Map<string, Set<WebSocket>>();
const connectionTokens = new WeakMap<WebSocket, string>();

export const setupWebSocketServer = (server: Server): WebSocketServer => {
  const wss = new WebSocketServer({
    server,
    maxPayload: 8192,
    verifyClient: (info, done) => {
      if (info.origin && !["http://127.0.0.1:5174", "http://localhost:5174"].includes(info.origin))
        return done(false, 403);
      void sessionAccount(cookieToken(info.req.headers.cookie))
        .then((user) => done(Boolean(user), user ? 101 : 401))
        .catch(() => done(false, 503));
    },
  });

  wss.on("connection", (ws, request) => {
    const token = cookieToken(request.headers.cookie)!;
    connectionTokens.set(ws, token);
    log.info(`New WebSocket connection from ${request.socket.remoteAddress}`);

    // We expect the client to authenticate/subscribe to a specific project
    // Expected message format: { type: "subscribe", projectId: "uuid" }

    let subscribedProjectId: string | null = null;

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "subscribe" && message.projectId) {
          if (typeof message.projectId !== "string" || !/^[0-9a-f-]{36}$/i.test(message.projectId))
            return;
          const user = await sessionAccount(token);
          if (!user || !(await canAccessProject(user, message.projectId))) {
            ws.close(4403, "Project access denied");
            return;
          }
          if (ws.readyState !== WebSocket.OPEN) return;
          if (subscribedProjectId) {
            const old = projectSubscribers.get(subscribedProjectId);
            old?.delete(ws);
            if (old?.size === 0) projectSubscribers.delete(subscribedProjectId);
          }
          subscribedProjectId = message.projectId;

          if (!projectSubscribers.has(subscribedProjectId!)) {
            projectSubscribers.set(subscribedProjectId!, new Set());
          }

          projectSubscribers.get(subscribedProjectId!)!.add(ws);
          log.info({ projectId: subscribedProjectId }, "Client subscribed to project stream");

          ws.send(JSON.stringify({ type: "subscribed", projectId: subscribedProjectId }));
        }
      } catch (error) {
        log.warn({ error: String(error) }, "Received invalid WebSocket message");
      }
    });

    ws.on("close", () => {
      log.info("WebSocket connection closed");
      if (subscribedProjectId && projectSubscribers.has(subscribedProjectId)) {
        projectSubscribers.get(subscribedProjectId)!.delete(ws);
        if (projectSubscribers.get(subscribedProjectId)!.size === 0) {
          projectSubscribers.delete(subscribedProjectId);
        }
      }
    });
  });

  return wss;
};

/**
 * Utility function to broadcast a message to all clients subscribed to a specific project.
 * This can be called from anywhere in the API.
 */
export const broadcastToProject = (projectId: string, event: string, data: any) => {
  const subscribers = projectSubscribers.get(projectId);
  if (subscribers && subscribers.size > 0) {
    const payload = JSON.stringify({ type: event, projectId, data });
    for (const client of subscribers) {
      if (client.readyState === WebSocket.OPEN) {
        void sessionAccount(connectionTokens.get(client))
          .then((user) => {
            if (!user) {
              client.close(4401, "Session expired");
              return;
            }
            if (client.readyState === WebSocket.OPEN) client.send(payload);
          })
          .catch(() => client.close(1011, "Session check failed"));
      }
    }
  }
};
