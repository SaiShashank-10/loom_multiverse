import { it, expect } from "vitest";
import { InteractiveLoop } from "./interactive-loop.js";
it("processes generate-and-proceed as a change before approving", async () => {
  const input = ["generate all the screens and proceed.", "approve"];
  const actions: string[] = [];
  const result = await new InteractiveLoop().run({
    agentName: "test",
    phase: "code_gen",
    projectId: "test",
    systemPrompt: "test",
    initialAgentMessage: "test",
    onMessage: () => {},
    waitForUserInput: async () => input.shift()!,
    onCustomAction: async (message) => {
      actions.push(message);
      return "Generated";
    },
    llm: { invoke: async () => ({ content: "{}" }) } as any,
  });
  expect(actions).toEqual(["generate all the screens and proceed."]);
  expect(result.approved).toBe(true);
});
it("cancellation exits without approval or LLM calls", async () => {
  const result = await new InteractiveLoop().run({
    agentName: "test",
    phase: "code_gen",
    projectId: "test",
    systemPrompt: "test",
    initialAgentMessage: "test",
    onMessage: () => {},
    waitForUserInput: async () => "cancel",
    llm: {
      invoke: async () => {
        throw new Error("must not run");
      },
    } as any,
  });
  expect(result.approved).toBe(false);
});
