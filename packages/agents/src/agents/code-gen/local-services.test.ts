import { it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { localServicesSchema, startLocalServices, stopLocalServices } from "./local-services.js";
it("rejects remote health checks and duplicate services", () => {
  const service = {
    name: "api",
    directory: ".",
    file: "node",
    args: ["server.cjs"],
    healthUrl: "https://example.com/health",
  };
  expect(() => localServicesSchema.parse({ services: [service] })).toThrow("local HTTP");
  service.healthUrl = "http://localhost:3000/health";
  expect(() => localServicesSchema.parse({ services: [service, service] })).toThrow("unique");
});
it("starts a real local service and checks its health before returning the Android port", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-service-test-"));
  const port = await new Promise<number>((resolve) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
  try {
    await fs.writeFile(
      path.join(root, "server.cjs"),
      `require('node:http').createServer((req,res)=>{res.writeHead(req.url==='/health'?200:404);res.end('healthy');}).listen(${port},'127.0.0.1');`,
    );
    await fs.writeFile(
      path.join(root, "loom.services.json"),
      JSON.stringify({
        services: [
          {
            name: "api",
            directory: ".",
            file: "node",
            args: ["server.cjs"],
            healthUrl: `http://127.0.0.1:${port}/health`,
          },
        ],
      }),
    );
    expect(await startLocalServices(root, process.env, () => {})).toEqual([port]);
    expect(await (await fetch(`http://127.0.0.1:${port}/health`)).text()).toBe("healthy");
  } finally {
    await stopLocalServices(root);
    await fs.rm(root, { recursive: true, force: true });
  }
}, 15000);
