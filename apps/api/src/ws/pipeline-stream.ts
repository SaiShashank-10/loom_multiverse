import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { createLogger } from "@loom/shared/logger";

const log = createLogger("api-ws");

// A simple in-memory map of projectId -> Set of WebSocket connections
// In a scalable production app, this would be Redis Pub/Sub
const projectSubscribers = new Map<string, Set<WebSocket>>();

export const setupWebSocketServer = (server: Server): WebSocketServer => {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, request) => {
    log.info(`New WebSocket connection from ${request.socket.remoteAddress}`);
    
    // We expect the client to authenticate/subscribe to a specific project
    // Expected message format: { type: "subscribe", projectId: "uuid" }
    
    let subscribedProjectId: string | null = null;

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "subscribe" && message.projectId) {
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
        client.send(payload);
      }
    }
  }
};
