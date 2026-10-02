import { it, expect } from "vitest";
import { PassThrough } from "node:stream";
import { terminalInput } from "./terminal-input.js";
it("preserves pasted lines while an agent is busy and returns the full error block", async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const reader = terminalInput(input, output);
  input.write("/paste\nError: build failed\n  at file.ts:4\n\n/end\n/retry\n/done\n");
  expect(await reader.read()).toBe("Error: build failed\n  at file.ts:4");
  expect(await reader.read()).toBe("/retry");
  expect(await reader.read()).toBe("/done");
  input.end();
  expect(await reader.read()).toBe("");
  reader.close();
});
it("returns an unfinished pasted block on EOF without hanging", async () => {
  const input = new PassThrough();
  const reader = terminalInput(input, new PassThrough());
  input.end("/paste\nfailed\n");
  expect(await reader.read()).toBe("failed");
  expect(await reader.read()).toBe("");
  reader.close();
});
