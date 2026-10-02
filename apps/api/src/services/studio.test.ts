import { expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  run: vi.fn(),
  read: vi.fn(() => null),
  resume: vi.fn(async () => ({ resumePhase: "stitch", rawIdea: "saved requirements" })),
  broadcast: vi.fn(),
  update: vi.fn(async () => {}),
}));
vi.mock("@loom/agents", () => ({
  PipelineRunner: { run: mock.run },
  readCheckpoint: mock.read,
  loadProjectResume: mock.resume,
}));
vi.mock("@loom/database", () => ({
  projects: { id: "id" },
  createDatabaseClient: () => ({ update: () => ({ set: () => ({ where: mock.update }) }) }),
}));
vi.mock("../ws/pipeline-stream.js", () => ({ broadcastToProject: mock.broadcast }));
import { startSession, studioState, replyToSession } from "./studio.js";

it("passes the real founder context, isolates approval replies, and releases the run lock", async () => {
  const id = "a1234567-1234-4234-8234-123456789012";
  let reply: Promise<string> | undefined;
  let finish!: (value: any) => void;
  mock.run.mockImplementation((options) => {
    options.onMessage("agent:message", { phase: "planning", message: "Review this plan." });
    options.onMessage("pipeline:progress", {
      currentPhase: "planning",
      context: { apiKey: "private" },
    });
    reply = options.waitForUserInput();
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  expect(await startSession(id, "Build a Flutter wardrobe app", false)).toEqual({ started: true });
  expect(mock.run.mock.calls[0]![0].initialContext.rawIdea).toBe("Build a Flutter wardrobe app");
  expect((await studioState(id)).waiting).toBe(true);
  expect(await startSession("b1234567-1234-4234-8234-123456789012", "another idea", false)).toEqual(
    { conflict: id },
  );
  expect(replyToSession("b1234567-1234-4234-8234-123456789012", "approve")).toBe(false);
  expect(replyToSession(id, "approve")).toBe(true);
  expect(await reply).toBe("approve");
  expect(replyToSession(id, "approve")).toBe(false);
  expect(JSON.stringify(mock.broadcast.mock.calls)).not.toContain("apiKey");
  finish({ currentPhase: "code_gen", error: null });
  await vi.waitFor(async () => expect((await studioState(id)).status).toBe("completed"));
  mock.run.mockResolvedValue({ currentPhase: "code_gen", error: null });
  expect(await startSession("c1234567-1234-4234-8234-123456789012", "", true)).toEqual({
    started: true,
  });
  expect(mock.resume).toHaveBeenCalled();
  await vi.waitFor(async () =>
    expect((await studioState("c1234567-1234-4234-8234-123456789012")).status).toBe("completed"),
  );
});

it("preserves genuine pipeline failure rather than reporting completion", async () => {
  mock.run.mockResolvedValue({ currentPhase: "stitch", error: "Stitch service unavailable" });
  const id = "d1234567-1234-4234-8234-123456789012";
  await startSession(id, "idea", false);
  await vi.waitFor(async () => expect((await studioState(id)).status).toBe("failed"));
});
