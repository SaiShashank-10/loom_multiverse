import { afterAll, beforeAll, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const fixture = vi.hoisted(() => ({ root: "" }));
vi.mock("../services/studio.js", () => ({
  workspaceRoot: () => fixture.root,
  repositoryRoot: ".",
}));
vi.mock("@loom/agents", () => ({ readCheckpoint: () => undefined }));
import { artifactsRouter } from "./artifacts.js";
const id = "531fbde1-23b7-42a7-bd8b-d4af1d650b3a";
beforeAll(async () => {
  fixture.root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-artifacts-test-"));
  await fs.mkdir(path.join(fixture.root, "lib"));
  await fs.mkdir(path.join(fixture.root, ".loom-design"));
  await fs.mkdir(path.join(fixture.root, "docs"));
  await fs.writeFile(path.join(fixture.root, "lib/main.dart"), "void main() {}\n");
  await fs.writeFile(path.join(fixture.root, ".env"), "PRIVATE_VALUE=hidden");
  await fs.writeFile(
    path.join(fixture.root, ".loom-design/reference.json"),
    JSON.stringify({
      screens: [
        {
          id: "home",
          title: "Home",
          device: "MOBILE",
          screenshotUrl: "https://example.com/home.png",
        },
      ],
    }),
  );
  await fs.writeFile(
    path.join(fixture.root, "docs/STITCH_PROJECT.json"),
    JSON.stringify({ url: "https://stitch.withgoogle.com/projects/123" }),
  );
});
afterAll(async () => {
  await fs.rm(fixture.root, { recursive: true, force: true });
});
it("previews generated source while keeping secrets and traversal paths unavailable", async () => {
  const list = (await (await artifactsRouter.request(`/${id}/files`)).json()) as { data: string[] };
  expect(list.data).toContain("lib/main.dart");
  expect(list.data).not.toContain(".env");
  const source = (await (
    await artifactsRouter.request(`/${id}/file?path=lib%2Fmain.dart`)
  ).json()) as { data: { content: string } };
  expect(source.data.content).toBe("void main() {}\n");
  for (const name of [".env", "../.env", ".loom-design/reference.json"])
    expect(
      (await artifactsRouter.request(`/${id}/file?path=${encodeURIComponent(name)}`)).status,
    ).toBe(404);
  expect((await artifactsRouter.request("/invalid/files")).status).toBe(400);
});
it("returns saved Stitch references and its project link", async () => {
  const result = (await (await artifactsRouter.request(`/${id}/designs`)).json()) as {
    data: { screens: Record<string, string>[]; url: string };
  };
  expect(result.data.screens[0]).toMatchObject({ id: "home", title: "Home", device: "MOBILE" });
  expect(result.data.url).toBe("https://stitch.withgoogle.com/projects/123");
});
it("stores supported project briefs and rejects unsupported uploads", async () => {
  const form = new FormData();
  form.append("file", new File(["# Project brief"], "brief.md"));
  expect(
    (await artifactsRouter.request(`/${id}/documents`, { method: "POST", body: form })).status,
  ).toBe(201);
  expect(await fs.readdir(path.join(fixture.root, "uploads"))).toHaveLength(1);
  const invalid = new FormData();
  invalid.append("file", new File(["binary"], "app.exe"));
  expect(
    (await artifactsRouter.request(`/${id}/documents`, { method: "POST", body: invalid })).status,
  ).toBe(400);
});
