import { beforeEach, afterEach, it, expect, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  createProject: vi.fn(),
  openProject: vi.fn(),
  createDesignSystem: vi.fn(),
  listScreens: vi.fn(),
  generateScreens: vi.fn(),
  refineScreen: vi.fn(),
  review: vi.fn(),
}));
vi.mock("../base-agent.js", () => ({
  BaseAgent: class {
    phase: string;
    log = { warn: vi.fn(), error: vi.fn() };
    constructor(config: any) {
      this.phase = config.phase;
    }
    async run(input: any) {
      return (this as any).execute(input, input.llm);
    }
  },
}));
vi.mock("./stitch-client.js", () => ({
  StitchClient: class {
    connect = mocks.connect;
    disconnect = mocks.disconnect;
    createProject = mocks.createProject;
    openProject = mocks.openProject;
    createDesignSystem = mocks.createDesignSystem;
    listScreens = mocks.listScreens;
    generateScreens = mocks.generateScreens;
    refineScreen = mocks.refineScreen;
  },
}));
vi.mock("../../orchestrator/interactive-loop.js", () => ({
  InteractiveLoop: class {
    run = mocks.review;
  },
}));
import { StitchAgent } from "./stitch-agent.js";
import { requireStitchResult } from "./stitch-state.js";
let root: string;
beforeEach(async () => {
  vi.resetAllMocks();
  root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-stitch-test-"));
  await fs.writeFile(path.join(root, "PRD.md"), "Flutter expense tracker");
  await fs.writeFile(path.join(root, "UI_DESIGN.md"), "Budget and transaction screens");
  mocks.createProject.mockResolvedValue({
    projectId: "123",
    url: "https://stitch.withgoogle.com/projects/123",
  });
  mocks.disconnect.mockResolvedValue(undefined);
  mocks.review.mockResolvedValue({ approved: true });
  mocks.listScreens.mockResolvedValue([{ id: "screen1" }]);
});
afterEach(async () => {
  if (!path.basename(root).startsWith("loom-stitch-test-"))
    throw new Error("Unexpected fixture path");
  await fs.rm(root, { recursive: true, force: true });
});
function input(interactive = false) {
  return {
    projectId: "test",
    phase: "stitch",
    payload: { technicalPlan: { hasFrontend: true }, documentsPath: root },
    interactive,
    waitForUserInput: async () => "approve",
    onMessage: vi.fn(),
    llm: { invoke: vi.fn().mockResolvedValue({ content: JSON.stringify({ screens: [] }) }) },
  } as any;
}
it("connection failure returns failed design and never calls generation", async () => {
  mocks.connect.mockRejectedValue(new Error("network failure"));
  const result = await new StitchAgent().run(input());
  expect(result.success).toBe(false);
  expect(result.error).toContain("NOT started");
  expect(mocks.generateScreens).not.toHaveBeenCalled();
  expect(mocks.disconnect).toHaveBeenCalled();
  expect(() => requireStitchResult(result.data!, false)).toThrow();
});
it("missing UI documents are a failure rather than a silent bypass", async () => {
  await fs.unlink(path.join(root, "UI_DESIGN.md"));
  const result = await new StitchAgent().run(input());
  expect(result.success).toBe(false);
  expect(mocks.connect).not.toHaveBeenCalled();
});
it("requires review approval for interactive UI projects", async () => {
  mocks.review.mockResolvedValue({ approved: false });
  const result = await new StitchAgent().run(input(true));
  expect(result.success).toBe(false);
});
it("blocks approval after a failed design edit", async () => {
  mocks.refineScreen.mockRejectedValue(new Error("edit request failed"));
  mocks.review.mockImplementation(async (options: any) => {
    await options.onCustomAction("Change the dashboard to dark mode", []);
    return { approved: true };
  });
  const result = await new StitchAgent().run(input(true));
  expect(result.success).toBe(false);
  expect(result.error).toContain("edit request failed");
  expect(() => requireStitchResult(result.data!, true)).toThrow();
});
it("persists completed approved designs for code generation", async () => {
  const request = input(true);
  const result = await new StitchAgent().run(request);
  expect(result.success).toBe(true);
  expect(requireStitchResult({ ...request.payload, ...result.data }, true).status).toBe("approved");
  expect(
    JSON.parse(await fs.readFile(path.join(root, "STITCH_RESULT.json"), "utf8")).projectId,
  ).toBe("123");
});
it("incomplete generation is blocked", async () => {
  const request = input();
  request.llm.invoke.mockResolvedValue({
    content: JSON.stringify({ screens: [{ name: "Budget", prompt: "Budget screen" }] }),
  });
  mocks.listScreens.mockResolvedValue([]);
  const result = await new StitchAgent().run(request);
  expect(result.success).toBe(false);
  expect(result.error).toContain("incomplete");
  expect(mocks.generateScreens).toHaveBeenCalledTimes(1);
});
it("explicit backend-only plans do not call Stitch, but UI plans cannot use that bypass", async () => {
  const request = input();
  request.payload.technicalPlan.hasFrontend = false;
  const result = await new StitchAgent().run(request);
  expect(result.success).toBe(true);
  expect(mocks.connect).not.toHaveBeenCalled();
  expect(requireStitchResult({ ...request.payload, ...result.data }, false).status).toBe(
    "not_applicable",
  );
  expect(() =>
    requireStitchResult({ technicalPlan: { hasFrontend: true }, ...result.data }, false),
  ).toThrow();
});
it("direct code generation rejects missing or unapproved design state", () => {
  expect(() => requireStitchResult({}, true)).toThrow();
  expect(() =>
    requireStitchResult(
      {
        stitch: {
          status: "completed",
          screens: [{ id: "one" }],
          projectId: "123",
          url: "https://stitch.withgoogle.com/projects/123",
        },
      },
      true,
    ),
  ).toThrow("approval");
});

it("screen-count mismatch opens real chat for questions, edits and explicit approval", async () => {
  const { InteractiveLoop } = await vi.importActual<
    typeof import("../../orchestrator/interactive-loop.js")
  >("../../orchestrator/interactive-loop.js");
  mocks.review.mockImplementation((options) => new InteractiveLoop().run(options));
  const request = input(true);
  const replies = ["Why this layout?", "Change the dashboard to dark mode", "designs are approved"];
  request.waitForUserInput = vi.fn(async () => replies.shift()!);
  request.llm.invoke
    .mockResolvedValueOnce({
      content: JSON.stringify({
        screens: [
          { name: "Budget", prompt: "Budget" },
          { name: "Login", prompt: "Login" },
        ],
      }),
    })
    .mockResolvedValueOnce({ content: '{"intent":"question","summary":"Explain layout"}' })
    .mockResolvedValueOnce({ content: "The layout prioritizes your budget." })
    .mockResolvedValueOnce({ content: "Use dark mode" });
  const result = await new StitchAgent().run(request);
  expect(result.success).toBe(true);
  expect(mocks.generateScreens).toHaveBeenCalledTimes(2);
  expect(mocks.refineScreen).toHaveBeenCalledTimes(1);
  expect(request.waitForUserInput).toHaveBeenCalledTimes(3);
  expect(request.llm.invoke).toHaveBeenCalledTimes(4);
  expect(result.chatHistory?.some((m) => m.content.includes("may be incomplete"))).toBe(true);
  expect(result.chatHistory?.some((m) => m.content.includes("prioritizes"))).toBe(true);
  expect(requireStitchResult({ ...request.payload, ...result.data }, true).status).toBe("approved");
});
it("empty designs keep the real review loop open instead of approving", async () => {
  const { InteractiveLoop } = await vi.importActual<
    typeof import("../../orchestrator/interactive-loop.js")
  >("../../orchestrator/interactive-loop.js");
  mocks.review.mockImplementation((options) => new InteractiveLoop().run(options));
  mocks.listScreens.mockResolvedValue([]);
  const request = input(true);
  request.llm.invoke.mockResolvedValue({
    content: '{"screens":[{"name":"Budget","prompt":"Budget"}]}',
  });
  const replies = ["approve", "cancel"];
  request.waitForUserInput = vi.fn(async () => replies.shift()!);
  const result = await new StitchAgent().run(request);
  expect(result.success).toBe(false);
  expect(request.waitForUserInput).toHaveBeenCalledTimes(2);
  expect(request.onMessage.mock.calls.some(([event]: [string]) => event === "phase:approved")).toBe(
    false,
  );
});

it("explicit approval accepts refreshed existing screens after a transient edit failure", async () => {
  const { InteractiveLoop } = await vi.importActual<
    typeof import("../../orchestrator/interactive-loop.js")
  >("../../orchestrator/interactive-loop.js");
  mocks.review.mockImplementation((options) => new InteractiveLoop().run(options));
  mocks.refineScreen.mockRejectedValue(new Error("service unavailable"));
  const request = input(true);
  const replies = ["Change to dark mode", "approved"];
  request.waitForUserInput = vi.fn(async () => replies.shift()!);
  const result = await new StitchAgent().run(request);
  expect(result.success).toBe(true);
  expect(request.waitForUserInput).toHaveBeenCalledTimes(2);
  expect(
    request.onMessage.mock.calls.filter(([event]: [string]) => event === "phase:approved"),
  ).toHaveLength(1);
});

it("resume reuses saved project and opens review without regenerating", async () => {
  mocks.openProject.mockResolvedValue({
    projectId: "6724583254749986451",
    url: "https://stitch.withgoogle.com/projects/6724583254749986451",
  });
  const request = input(true);
  request.payload.resumeStitch = true;
  request.payload.stitchProjectId = "6724583254749986451";
  const result = await new StitchAgent().run(request);
  expect(result.success).toBe(true);
  expect(mocks.openProject).toHaveBeenCalledWith("6724583254749986451");
  expect(mocks.createProject).not.toHaveBeenCalled();
  expect(mocks.generateScreens).not.toHaveBeenCalled();
  expect(mocks.review).toHaveBeenCalledOnce();
});
it("inaccessible resumed project never creates a replacement", async () => {
  mocks.openProject.mockRejectedValue(new Error("Access denied"));
  const request = input(true);
  request.payload.resumeStitch = true;
  request.payload.stitchProjectId = "123";
  expect((await new StitchAgent().run(request)).success).toBe(false);
  expect(mocks.createProject).not.toHaveBeenCalled();
  expect(mocks.review).not.toHaveBeenCalled();
});

it("explicit Home page request calls Stitch directly even if the LLM returns prose", async () => {
  const { InteractiveLoop } = await vi.importActual<
    typeof import("../../orchestrator/interactive-loop.js")
  >("../../orchestrator/interactive-loop.js");
  mocks.review.mockImplementation((options) => new InteractiveLoop().run(options));
  mocks.openProject.mockResolvedValue({
    projectId: "123",
    url: "https://stitch.withgoogle.com/projects/123",
  });
  const request = input(true);
  request.payload.resumeStitch = true;
  request.payload.stitchProjectId = "123";
  request.llm.invoke.mockResolvedValue({ content: "Here is an HTML proposal, not JSON." });
  const replies = ["Generate a separate Home page screen with modern UI", "approve"];
  request.waitForUserInput = async () => replies.shift()!;
  const result = await new StitchAgent().run(request);
  expect(result.success).toBe(true);
  expect(mocks.generateScreens).toHaveBeenCalledOnce();
  expect(mocks.generateScreens.mock.calls[0]?.[1]).toContain("separate Home page");
  expect(mocks.createProject).not.toHaveBeenCalled();
  expect(request.llm.invoke).not.toHaveBeenCalled();
});

it.each([
  ['Build a Flutter mobile application', 'MOBILE'],
  ['Build a React Native mobile application', 'MOBILE'],
  ['Build a responsive web-based career website', 'DESKTOP'],
])('routes initial and additional screens using approved target: %s', async (requirements, device) => {
  const request = input(true);
  request.payload.approvedRequirements = requirements;
  request.payload.technicalPlan = { hasFrontend: true, frontend: 'Flutter' };
  request.llm.invoke.mockResolvedValue({ content: '{"screens":[{"name":"Search","prompt":"Search layout"}]}' });
  mocks.review.mockImplementation(async (options: any) => {
    await options.onCustomAction('Add a separate Settings screen', [], 'feedback');
    return { approved: true };
  });
  const result = await new StitchAgent().run(request);
  expect(result.success).toBe(true);
  expect(mocks.generateScreens).toHaveBeenCalledTimes(2);
  for (const [project, prompt, target] of mocks.generateScreens.mock.calls) {
    expect(project).toBe('123');
    expect(target).toBe(device);
    expect(prompt).toContain(requirements);
    expect(prompt).toContain(`Required Stitch deviceType: ${device}`);
  }
  const saved = JSON.parse(await fs.readFile(path.join(root, 'STITCH_RESULT.json'), 'utf8'));
  expect(saved.target.deviceType).toBe(device);
});

it('keeps the approved platform in refinement instructions despite a generic model reply', async () => {
  const request = input(true);
  request.payload.approvedRequirements = 'Build a responsive web-based dashboard';
  request.llm.invoke.mockResolvedValueOnce({ content: '{"screens":[]}' }).mockResolvedValue({ content: 'Use navy surfaces' });
  mocks.review.mockImplementation(async (options: any) => {
    await options.onCustomAction('Change the theme to navy', [], 'feedback');
    return { approved: true };
  });
  expect((await new StitchAgent().run(request)).success).toBe(true);
  expect(mocks.refineScreen.mock.calls[0]?.[2]).toContain('Required Stitch deviceType: DESKTOP');
});

it('explicit mobile requirements cannot be bypassed by an incorrect backend-only plan', async () => {
  const request = input(true);
  request.payload.approvedRequirements = 'Build a Flutter mobile application';
  request.payload.technicalPlan.hasFrontend = false;
  expect((await new StitchAgent().run(request)).success).toBe(true);
  expect(mocks.connect).toHaveBeenCalled();
});
