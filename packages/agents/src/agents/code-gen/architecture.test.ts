import { it, expect, vi } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  generateArchitecture,
  summarizeDesigns,
  architectureSections,
  architectureSchema,
} from "./architecture.js";
const valid = { files: [{ path: "main.py", description: "entry point" }] };
function model(responses: unknown[]) {
  const stream = vi.fn(async function* () {
    yield { content: JSON.stringify(responses.shift()) };
  });
  return { stream };
}
it("passes native schema to Ollama and retries invalid files", async () => {
  const llm = model([{}, valid]);
  expect((await generateArchitecture(llm as any, "plan", "[]")).files).toEqual(valid.files);
  expect((llm.stream.mock.calls as any)[0][1].format).toEqual(architectureSchema);
  expect(llm.stream).toHaveBeenCalledTimes(2);
});
it("rejects empty manifests", async () => {
  await expect(
    generateArchitecture(model([{ files: [] }, { files: [] }, { files: [] }]) as any, "plan", "[]"),
  ).rejects.toThrow("3 attempts");
});
it("cancels stalled inference without overlapping retries", async () => {
  let signal: AbortSignal | undefined;
  const stream = vi.fn((_messages, options) => {
    signal = options.signal;
    return new Promise(() => {});
  });
  await expect(generateArchitecture({ stream } as any, "plan", "[]", () => {}, 10)).rejects.toThrow(
    "cancelled",
  );
  expect(signal?.aborted).toBe(true);
  expect(stream).toHaveBeenCalledOnce();
});
it("allows total runtime beyond idle timeout while tokens arrive", async () => {
  vi.useFakeTimers();
  try {
    const text = JSON.stringify(valid);
    const stream = async function* () {
      for (const char of text) {
        await new Promise((r) => setTimeout(r, 5));
        yield { content: char };
      }
    };
    const task = generateArchitecture({ stream } as any, "plan", "[]", () => {}, 20);
    await vi.runAllTimersAsync();
    expect((await task).files).toEqual(valid.files);
  } finally {
    vi.useRealTimers();
  }
});
it("saves completed batches and reuses them on resume", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loom-architecture-"));
  try {
    const target = path.join(dir, "progress.json");
    const context = "a".repeat(6001);
    const first = model([valid, {}, {}, {}]);
    await expect(
      generateArchitecture(first as any, context, "[]", () => {}, 1000, target),
    ).rejects.toThrow("batch 2");
    const second = model([
      {
        files: [
          { path: "main.py", description: "entry point" },
          { path: "requirements.txt", description: "dependencies" },
        ],
      },
    ]);
    const result = await generateArchitecture(second as any, context, "[]", () => {}, 1000, target);
    expect(second.stream).toHaveBeenCalledOnce();
    expect(result.files).toHaveLength(2);
    expect(architectureSections(context).join("")).toBe(context);
  } finally {
    await fs.rm(path.join(dir, "progress.json"), { force: true });
    await fs.rmdir(dir);
  }
});
it("removes bulky screen content", () => {
  const summary = summarizeDesigns(
    JSON.stringify([{ id: "1", title: "Home", htmlCode: "large HTML" }]),
  );
  expect(summary).toContain("Home");
  expect(summary).not.toContain("large HTML");
});
