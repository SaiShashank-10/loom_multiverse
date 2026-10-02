import { it, expect } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { prepareManifest } from "./manifest.js";
import { safePath } from "./validation.js";
const root = path.join(os.tmpdir(), "loom-manifest-tests");
const manifest = (paths: string[]) => ({
  files: paths.map((path) => ({ path, description: "configuration" })),
});
it("maps root and nested environment proposals to safe templates", () => {
  const result = prepareManifest(
    manifest([".env", "backend\\.env.local", "frontend/.ENV.PRODUCTION"]),
    root,
  );
  expect(result.files.map((f) => f.path)).toEqual([
    ".env.example",
    "backend/.env.example",
    "frontend/.env.example",
  ]);
  expect(result.files.every((f) => f.description.includes("placeholders"))).toBe(true);
});
it("merges template collisions in saved manifests and repeated architecture batches", () => {
  const result = prepareManifest(
    manifest([".env", ".env.example", "./.env.local", "backend/main.py", "backend/main.py"]),
    root,
  );
  expect(result.files.map((f) => f.path)).toEqual([".env.example", "backend/main.py"]);
  expect(prepareManifest(result, root)).toEqual(result);
});
it.each([
  "../.env",
  "backend/../../.env",
  ".git/config",
  "pipeline-checkpoint.json",
  "C:/outside/.env",
])("still rejects unsafe proposal %s", (file) => {
  expect(() => prepareManifest(manifest([file]), root)).toThrow();
});
it("never reads or modifies a real environment file", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "loom-env-fixture-"));
  try {
    const env = path.join(directory, ".env");
    await fs.writeFile(env, "SECRET=keep-this-local");
    prepareManifest(manifest([".env"]), directory);
    expect(await fs.readFile(env, "utf8")).toBe("SECRET=keep-this-local");
    expect(() => safePath(directory, ".env")).toThrow("Protected");
  } finally {
    await fs.unlink(path.join(directory, ".env"));
    await fs.rmdir(directory);
  }
});
