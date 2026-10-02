vi.mock("./checkpoint.js", async (original) => ({
  ...(await original<typeof import("./checkpoint.js")>()),
  saveCheckpoint: vi.fn(),
}));
import { it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ stream: vi.fn(), invoke: vi.fn(), setCallbacks: vi.fn() }));
vi.mock("./graph.js", () => ({
  setInteractiveCallbacks: mocks.setCallbacks,
  orchestratorGraph: { compile: () => ({ stream: mocks.stream, invoke: mocks.invoke }) },
}));
import { PipelineRunner } from "./runner.js";
it("keeps full state from values stream and reports phase failure", async () => {
  const state = {
    projectId: "test",
    currentPhase: "code_gen",
    context: {
      rawIdea: "Flutter",
      validatedIdea: { techStackHints: ["Flutter"] },
      validation: { success: false },
    },
    error: "build failed",
  };
  mocks.stream.mockImplementation(async function* () {
    yield state;
  });
  const events: string[] = [];
  const result = await PipelineRunner.run({
    projectId: "test",
    onMessage: (event) => events.push(event),
  });
  expect(result.context.rawIdea).toBe("Flutter");
  expect(result.error).toBe("build failed");
  expect(events).toContain("pipeline:error");
  expect(events).not.toContain("pipeline:completed");
  expect(mocks.stream.mock.calls.at(-1)?.[1]).toMatchObject({ streamMode: "values" });
});
it("reports completion only for successful final state", async () => {
  mocks.stream.mockImplementation(async function* () {
    yield { currentPhase: "code_gen", context: { validation: { success: true } }, error: null };
  });
  const events: string[] = [];
  await PipelineRunner.run({ projectId: "test2", onMessage: (event) => events.push(event) });
  expect(events).toContain("pipeline:completed");
  expect(events).not.toContain("pipeline:error");
});
