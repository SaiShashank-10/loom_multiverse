import { beforeAll, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
// This suite is intentionally run by scripts/test-auth.mjs in a disposable database.
// Never register/delete test users in the user's real workspace database.
vi.mock("../services/saved-projects.js", () => ({
  savedProject: async () => null,
  savedProjects: async () => [],
}));
vi.mock("@loom/agents", () => ({
  readCheckpoint: () => null,
  loadProjectResume: async () => ({}),
  PipelineRunner: { run: vi.fn() },
}));
const enabled = Boolean(process.env.LOOM_AUTH_TEST_DATABASE_URL);
describe.runIf(enabled)("account and project isolation against PostgreSQL", () => {
  let app: typeof import("../app.js").app;
  let db: typeof import("../services/accounts.js").accountDb;
  let tables: typeof import("@loom/database");
  let ownerCookie: string;
  let memberCookie: string;
  let ownerId: string;
  let legacyId: string;
  const json = (data: unknown, cookie?: string) => ({
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(data),
  });
  const cookie = (r: Response) => r.headers.get("set-cookie")!.split(";")[0]!;
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.startsWith("/loom_auth_test_"))
      throw new Error("Refusing to test accounts in a non-test database");
    ({ app } = await import("../app.js"));
    ({ accountDb: db } = await import("../services/accounts.js"));
    tables = await import("@loom/database");
    const [legacy] = await db
      .insert(tables.projects)
      .values({
        name: "Legacy project",
        description: "Existing CLI work",
        founderPrompt: "original requirement",
      })
      .returning();
    legacyId = legacy!.id;
  });
  it("requires a session and blocks untrusted origins", async () => {
    expect((await app.request("/projects")).status).toBe(401);
    expect(
      (
        await app.request("/auth/register", {
          ...json({}),
          headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" },
        })
      ).status,
    ).toBe(403);
  });
  it("registers the first owner, hashes the password, and claims legacy projects", async () => {
    const response = await app.request(
      "/auth/register",
      json({
        name: "Test owner",
        email: "OWNER@example.test",
        password: "only-a-test-passphrase-123",
      }),
    );
    expect(response.status).toBe(201);
    ownerCookie = cookie(response);
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(response.headers.get("set-cookie")).toMatch(/SameSite=Strict/i);
    const body = (await response.json()) as any;
    ownerId = body.data.id;
    expect(body.data.email).toBe("owner@example.test");
    expect(body.data.workspaceOwner).toBe(true);
    expect(body.data.passwordHash).toBeUndefined();
    const accounts = await db.select().from(tables.users);
    expect(accounts[0]!.passwordHash).not.toContain("only-a-test-passphrase");
    const rows = await db.select().from(tables.projects);
    expect(rows[0]!.ownerId).toBe(ownerId);
    const tokens = await db.select().from(tables.sessions);
    expect(ownerCookie).not.toContain(tokens[0]!.tokenHash);
    expect(
      (
        await app.request(
          "/auth/register",
          json({
            name: "Duplicate",
            email: "owner@example.test",
            password: "only-a-test-passphrase-123",
          }),
        )
      ).status,
    ).toBe(409);
  }, 20000);
  it("isolates project lists, source, designs, uploads, feed and pipeline controls", async () => {
    const r = await app.request(
      "/auth/register",
      json({
        name: "Other account",
        email: "other@example.test",
        password: "different-test-passphrase-123",
      }),
    );
    expect(r.status).toBe(201);
    memberCookie = cookie(r);
    const list = (await (
      await app.request("/projects", { headers: { Cookie: memberCookie } })
    ).json()) as any;
    expect(list.data).toHaveLength(0);
    for (const route of [
      `/projects/${legacyId}`,
      `/projects/${legacyId}/files`,
      `/projects/${legacyId}/designs`,
      `/feed/${legacyId}`,
      `/pipeline/${legacyId}/state`,
    ])
      expect((await app.request(route, { headers: { Cookie: memberCookie } })).status).toBe(404);
    for (const route of [
      `/projects/${legacyId}/documents`,
      `/pipeline/${legacyId}/start`,
      `/pipeline/${legacyId}/resume`,
      `/pipeline/${legacyId}/message`,
    ])
      expect((await app.request(route, json({ message: "approve" }, memberCookie))).status).toBe(
        404,
      );
    const created = await app.request(
      "/projects",
      json(
        { name: "My project", description: "Private", founderPrompt: "Build my app" },
        memberCookie,
      ),
    );
    expect(created.status).toBe(201);
    const list2 = (await (
      await app.request("/projects", { headers: { Cookie: memberCookie } })
    ).json()) as any;
    expect(list2.data).toHaveLength(1);
  }, 20000);
  it("authorizes WebSocket subscriptions before sending project events", async () => {
    const { serve } = await import("@hono/node-server");
    const { WebSocket } = await import("ws");
    const once = EventEmitter.once;
    const { setupWebSocketServer, broadcastToProject } = await import("../ws/pipeline-stream.js");
    const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
    if (!server.listening) await once(server, "listening");
    const wss = setupWebSocketServer(server as import("node:http").Server);
    const address = server.address() as import("node:net").AddressInfo;
    const owner = new WebSocket(`ws://127.0.0.1:${address.port}/ws`, {
      headers: { Cookie: ownerCookie, Origin: "http://127.0.0.1:5174" },
    });
    const other = new WebSocket(`ws://127.0.0.1:${address.port}/ws`, {
      headers: { Cookie: memberCookie, Origin: "http://127.0.0.1:5174" },
    });
    try {
      await Promise.all([once(owner, "open"), once(other, "open")]);
      const subscribed = once(owner, "message");
      owner.send(JSON.stringify({ type: "subscribe", projectId: legacyId }));
      expect(JSON.parse(String((await subscribed)[0])).type).toBe("subscribed");
      const delivered = once(owner, "message");
      broadcastToProject(legacyId, "studio:event", { message: "Review your plan" });
      expect(JSON.parse(String((await delivered)[0])).data.message).toBe("Review your plan");
      const rejected = once(other, "close");
      other.send(JSON.stringify({ type: "subscribe", projectId: legacyId }));
      expect((await rejected)[0]).toBe(4403);
    } finally {
      owner.terminate();
      other.terminate();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 15000);
  it("validates credentials, persists profile, rotates sessions and revokes logout", async () => {
    expect(
      (
        await app.request(
          "/auth/login",
          json({ email: "owner@example.test", password: "wrong-password" }),
        )
      ).status,
    ).toBe(401);
    const login = await app.request(
      "/auth/login",
      json({ email: "owner@example.test", password: "only-a-test-passphrase-123" }, ownerCookie),
    );
    expect(login.status).toBe(200);
    const old = ownerCookie;
    ownerCookie = cookie(login);
    expect((await app.request("/auth/me", { headers: { Cookie: old } })).status).toBe(401);
    const profile = await app.request("/auth/profile", {
      ...json({ name: "Updated owner" }, ownerCookie),
      method: "PATCH",
    });
    expect(profile.status).toBe(200);
    const changed = await app.request(
      "/auth/password",
      json(
        {
          currentPassword: "only-a-test-passphrase-123",
          newPassword: "brand-new-test-passphrase-456",
        },
        ownerCookie,
      ),
    );
    expect(changed.status).toBe(200);
    const after = cookie(changed);
    expect((await app.request("/auth/me", { headers: { Cookie: ownerCookie } })).status).toBe(401);
    const me = (await (
      await app.request("/auth/me", { headers: { Cookie: after } })
    ).json()) as any;
    expect(me.data.name).toBe("Updated owner");
    expect((await app.request("/auth/logout", json({}, after))).status).toBe(200);
    expect((await app.request("/auth/me", { headers: { Cookie: after } })).status).toBe(401);
  }, 30000);
});
