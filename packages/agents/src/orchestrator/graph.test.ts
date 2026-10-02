vi.mock("./checkpoint.js", async (original) => ({
  ...(await original<typeof import("./checkpoint.js")>()),
  saveCheckpoint: vi.fn(),
}));
import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("../agents/agent-registry.js", () => ({
  agentRegistry: { get: () => ({ run: mocks.run }) },
}));
vi.mock("../rag/document-processor.js", () => ({ DocumentProcessor: class {} }));
import { orchestratorGraph, setInteractiveCallbacks } from "./graph.js";

beforeEach(() => {
  mocks.run.mockReset();
  setInteractiveCallbacks({ interactive: false });
});
it("routes planning through Stitch before source generation", async () => {
  const phases: string[] = [];
  mocks.run.mockImplementation(async (input) => {
    phases.push(input.phase);
    return { success: true, data: { [input.phase]: true } };
  });
  const result = await orchestratorGraph.compile().invoke({ projectId: "test" });
  expect(phases).toEqual(["idea_check", "planning", "stitch", "code_gen"]);
  expect(result.error).toBeNull();
});
it.each([false, true])("Stitch failures stop the graph (throw=%s)", async (throws) => {
  const phases: string[] = [];
  mocks.run.mockImplementation(async (input) => {
    phases.push(input.phase);
    if (input.phase === "stitch") {
      if (throws) throw new Error("Stitch unavailable");
      return {
        success: false,
        error: "Stitch unavailable",
        data: { stitch: { status: "failed" } },
      };
    }
    return { success: true, data: {} };
  });
  const result = await orchestratorGraph.compile().invoke({ projectId: "test" });
  expect(phases).toEqual(["idea_check", "planning", "stitch"]);
  expect(result.currentPhase).toBe("stitch");
  expect(result.error).toBe("Stitch unavailable");
  expect(result.approvals.code_gen).toBeUndefined();
});

it("resumed design routes directly through Stitch and codegen", async () => {
  const phases: string[] = [];
  mocks.run.mockImplementation(async (input) => {
    phases.push(input.phase);
    return { success: true, data: {} };
  });
  await orchestratorGraph.compile().invoke({ projectId: "saved", context: { resumeStitch: true } });
  expect(phases).toEqual(["stitch", "code_gen"]);
});

it.each(["idea_check", "planning", "stitch", "code_gen"])(
  "resumes directly at %s without earlier phases",
  async (phase) => {
    const order = ["idea_check", "planning", "stitch", "code_gen"];
    const visited: string[] = [];
    mocks.run.mockImplementation(async (input) => {
      visited.push(input.phase);
      return { success: true, data: {} };
    });
    await orchestratorGraph
      .compile()
      .invoke({ projectId: "saved", context: { resumePhase: phase } });
    expect(visited).toEqual(order.slice(order.indexOf(phase)));
  },
);
