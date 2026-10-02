import { it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { phases, saveCheckpoint, readCheckpoint } from "./checkpoint.js";
import { loadRepairResume, loadProjectResume } from "./resume-project.js";
let cwd: string;
beforeEach(async () => {
  cwd = await fs.mkdtemp(path.join(os.tmpdir(), "loom-checkpoint-"));
});
afterEach(async () => {
  if (!path.basename(cwd).startsWith("loom-checkpoint-")) throw new Error("Invalid fixture");
  await fs.rm(cwd, { recursive: true, force: true });
});
it.each(phases)("restores interrupted %s with context and chat", async (phase) => {
  saveCheckpoint(
    {
      version: 1,
      projectId: "saved",
      phase,
      status: "running",
      context: { rawIdea: "Flutter", validatedIdea: { coreProblem: "Budget" } },
      chatHistory: { [phase]: [{ role: "user", content: "Use Firebase", timestamp: "now" }] },
      documents: ["idea.pdf"],
    },
    cwd,
  );
  const restored = await loadProjectResume("saved", cwd);
  expect(restored.resumePhase).toBe(phase);
  expect(restored.rawIdea).toBe("Flutter");
  expect(restored.resumeHistory[phase][0].content).toBe("Use Firebase");
  expect(restored.resumeDocuments).toEqual(["idea.pdf"]);
});
it("advances only completed phases; failed phases remain active", async () => {
  for (const status of ["failed", "completed"] as const) {
    saveCheckpoint(
      {
        version: 1,
        projectId: "saved",
        phase: "planning",
        status,
        context: {},
        chatHistory: {},
        documents: [],
      },
      cwd,
    );
    expect((await loadProjectResume("saved", cwd)).resumePhase).toBe(
      status === "failed" ? "planning" : "stitch",
    );
  }
});
it("completed code generation does not regenerate the project", async () => {
  saveCheckpoint(
    {
      version: 1,
      projectId: "saved",
      phase: "code_gen",
      status: "completed",
      context: {},
      chatHistory: {},
      documents: [],
    },
    cwd,
  );
  await expect(loadProjectResume("saved", cwd)).rejects.toThrow("already complete");
});
it("rejects corrupt checkpoints and path traversal", async () => {
  expect(() => readCheckpoint("../outside", cwd)).toThrow("Invalid project ID");
  const root = path.join(cwd, "runs", "workspaces", "saved");
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, "pipeline-checkpoint.json"), '{"version":99}');
  await expect(loadProjectResume("saved", cwd)).rejects.toThrow("Invalid saved");
});

it("reopens a completed project only through explicit repair and retains its context", async () => {
  saveCheckpoint(
    {
      version: 1,
      projectId: "saved",
      phase: "code_gen",
      status: "completed",
      context: { rawIdea: "Flutter mobile app", approvedRequirements: "Flutter" },
      chatHistory: {},
      documents: ["idea.pdf"],
    },
    cwd,
  );
  await expect(loadRepairResume("saved", cwd)).rejects.toThrow();
  await fs.writeFile(
    path.join(cwd, "runs/workspaces/saved/codegen-manifest.json"),
    JSON.stringify({ files: [{ path: "index.js", description: "Existing entry" }] }),
  );
  await fs.writeFile(path.join(cwd, "runs/workspaces/saved/package.json"), "{}");
  await fs.writeFile(path.join(cwd, "runs/workspaces/saved/index.js"), 'console.log("hello")');
  expect(await loadRepairResume("saved", cwd)).toMatchObject({
    resumePhase: "code_gen",
    repairOnly: true,
    rawIdea: "Flutter mobile app",
    approvedRequirements: "Flutter",
    resumeDocuments: ["idea.pdf"],
  });
  await expect(loadRepairResume("../outside", cwd)).rejects.toThrow("Invalid project ID");
});

it("recovers a legacy scoped Flutter project without inventing Stitch approval or replacing source", async () => {
  const root = path.join(cwd, "runs/workspaces/legacy");
  await fs.mkdir(path.join(root, "frontend/lib"), { recursive: true });
  await fs.writeFile(
    path.join(root, "loom.repair.json"),
    JSON.stringify({ directory: "frontend", requirements: "Flutter Firebase only" }),
  );
  await fs.writeFile(
    path.join(root, "frontend/pubspec.yaml"),
    "name: app\ndependencies: {flutter: {sdk: flutter}}",
  );
  await fs.writeFile(path.join(root, "frontend/lib/main.dart"), "void main() {}");
  await fs.writeFile(path.join(root, "frontend/.env"), "SECRET=never-copy");
  const restored = await loadRepairResume("legacy", cwd);
  expect(restored).toMatchObject({
    repairOnly: true,
    legacyRepair: true,
    repairDirectory: "frontend",
    approvedRequirements: "Flutter Firebase only",
    resumePhase: "code_gen",
  });
  expect(restored.stitch).toBeUndefined();
  const manifest = await fs.readFile(path.join(root, "frontend/codegen-manifest.json"), "utf8");
  expect(JSON.parse(manifest).files.map((f: any) => f.path)).toEqual([
    "lib/main.dart",
    "pubspec.yaml",
  ]);
  expect(await fs.readFile(path.join(root, "frontend/lib/main.dart"), "utf8")).toBe(
    "void main() {}",
  );
  await loadRepairResume("legacy", cwd);
  expect(await fs.readFile(path.join(root, "frontend/codegen-manifest.json"), "utf8")).toBe(
    manifest,
  );
  await fs.writeFile(
    path.join(root, "loom.repair.json"),
    JSON.stringify({ directory: "../../outside" }),
  );
  await expect(loadRepairResume("legacy", cwd)).rejects.toThrow("Protected");
});
it("reports missing workspaces and empty legacy projects without creating fake manifests", async () => {
  await expect(loadRepairResume("missing", cwd)).rejects.toThrow("workspace does not exist");
  await fs.mkdir(path.join(cwd, "runs/workspaces/empty"), { recursive: true });
  await expect(loadRepairResume("empty", cwd)).rejects.toThrow("no existing application");
});
