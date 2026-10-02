import { it, expect, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const runtime = vi.hoisted(() => ({
  prepare: vi.fn(),
  run: vi.fn(),
  stitch: vi.fn(() => ({ screens: [], skipped: true })),
}));
vi.mock("./mobile-runtime.js", () => ({
  prepareMobileProject: runtime.prepare,
  runMobileApp: runtime.run,
  runMobileCommand: vi.fn().mockResolvedValue('{"frameworkVersion":"3.38.5","dartSdkVersion":"3.10.4"}'),
}));
vi.mock("../base-agent.js", () => ({
  BaseAgent: class {
    phase = "code_gen";
    log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  },
}));
vi.mock("./stitch-state.js", () => ({
  requireStitchResult: runtime.stitch,
}));
vi.mock("./design-reference.js", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  loadDesignReference: async () => undefined,
}));
import { CodeGenAgent } from "./code-gen-agent.js";
async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loom-native-integration-"));
  const root = path.join(dir, "runs/workspaces/mobile");
  await fs.mkdir(path.join(root, "docs"), { recursive: true });
  await fs.writeFile(
    path.join(root, "codegen-manifest.json"),
    JSON.stringify({
      files: [
        { path: "pubspec.yaml", description: "Flutter dependencies" },
        { path: "lib/main.dart", description: "Native app entry" },
        { path: "test/app_test.dart", description: "Behavioral navigation tests" },
      ],
    }),
  );
  runtime.prepare.mockResolvedValue({ root, env: {}, framework: "flutter" });
  const agent = new CodeGenAgent() as any;
  vi.spyOn(agent, "selfHealingExecute").mockResolvedValue({
    success: true,
    checks: [],
    attempts: 1,
  });
  vi.spyOn(agent, "generateReadme").mockResolvedValue(undefined);
  const heal = vi.spyOn(agent, "healError").mockResolvedValue(true);
  const cwd = vi.spyOn(process, "cwd").mockReturnValue(dir);
  const input = {
    projectId: "mobile",
    payload: {
      technicalPlan: { framework: "Flutter" },
      documentsPath: path.join(root, "docs"),
      approvedRequirements: "Build a Flutter mobile app",
      repairOnly: true,
    },
    llm: { invoke: vi.fn() },
    interactive: true,
    waitForUserInput: vi.fn().mockResolvedValue("/done"),
  };
  return {
    agent,
    heal,
    input,
    dispose: async () => {
      cwd.mockRestore();
      await fs.rm(dir, { recursive: true, force: true });
    },
  };
}
it("repair mode retains architecture and does not report a native app running when launch failed", async () => {
  const f = await fixture();
  runtime.run.mockResolvedValue({
    success: false,
    isRunning: false,
    framework: "flutter",
    error: "Native startup failed",
  });
  try {
    const result = await f.agent.execute(f.input, f.input.llm);
    expect(result.success).toBe(false);
    expect(result.data.isRunning).toBe(false);
    expect(f.input.llm.invoke).not.toHaveBeenCalled();
    expect(f.heal).toHaveBeenCalled();
  } finally {
    await f.dispose();
  }
});
it("revalidates and relaunches after automatic repair before reporting success", async () => {
  const f = await fixture();
  runtime.run
    .mockReset()
    .mockResolvedValueOnce({ success: false, isRunning: false, error: "Runtime exception" })
    .mockResolvedValue({
      success: true,
      isRunning: true,
      framework: "flutter",
      packageId: "com.loom.app",
      deviceId: "emulator-5554",
    });
  try {
    const result = await f.agent.execute(f.input, f.input.llm);
    expect(result.success).toBe(true);
    expect(result.data.isRunning).toBe(true);
    expect(runtime.run).toHaveBeenCalledTimes(2);
    expect(f.input.waitForUserInput).not.toHaveBeenCalled();
    expect(f.heal).toHaveBeenCalledTimes(1);
  } finally {
    await f.dispose();
  }
});

it("legacy repair does not invent Stitch approval, regenerate architecture or overwrite documentation", async () => {
  const f = await fixture();
  (f.input.payload as any).legacyRepair = true;
  const architecture = vi.spyOn(f.agent, "generateFileStructure");
  runtime.stitch.mockClear();
  runtime.run.mockResolvedValue({ success: true, isRunning: true, framework: "flutter" });
  try {
    const result = await f.agent.execute(f.input, f.input.llm);
    expect(result.success).toBe(true);
    expect(runtime.stitch).not.toHaveBeenCalled();
    expect(architecture).not.toHaveBeenCalled();
    expect(f.agent.generateReadme).not.toHaveBeenCalled();
    expect(f.input.llm.invoke).not.toHaveBeenCalled();
  } finally {
    await f.dispose();
  }
});
