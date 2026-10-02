import { it, expect, vi } from "vitest";
import { ensureOllamaReady, retryInference, connectionDetail } from "./ollama-health.js";
const unavailable = () => new TypeError("fetch failed", { cause: { code: "ECONNREFUSED" } });
const healthy = () =>
  ({ ok: true, json: async () => ({ models: [{ name: "model:latest" }] }) }) as Response;
it("starts an unavailable local server and verifies the installed model", async () => {
  const dependencies = {
    fetch: vi.fn().mockRejectedValueOnce(unavailable()).mockResolvedValue(healthy()),
    start: vi.fn(),
    wait: vi.fn(),
  };
  await ensureOllamaReady("http://127.0.0.1:11434", "model", () => {}, dependencies);
  expect(dependencies.start).toHaveBeenCalledOnce();
  expect(dependencies.fetch).toHaveBeenCalledTimes(2);
});
it("never starts a server for a remote endpoint", async () => {
  const dependencies = {
    fetch: vi.fn().mockRejectedValue(unavailable()),
    start: vi.fn(),
    wait: vi.fn(),
  };
  await expect(
    ensureOllamaReady("http://remote.example:11434", "model", () => {}, dependencies),
  ).rejects.toThrow("unreachable");
  expect(dependencies.start).not.toHaveBeenCalled();
});
it("missing models are actionable and never silently downloaded", async () => {
  const dependencies = {
    fetch: vi.fn().mockResolvedValue(healthy()),
    start: vi.fn(),
    wait: vi.fn(),
  };
  await expect(
    ensureOllamaReady("http://localhost:11434", "other", () => {}, dependencies),
  ).rejects.toThrow("ollama pull other");
  expect(dependencies.start).not.toHaveBeenCalled();
});
it("recovers a transient inference connection", async () => {
  const operation = vi.fn().mockRejectedValueOnce(unavailable()).mockResolvedValue("actual code");
  const recover = vi.fn();
  expect(await retryInference(operation, recover, vi.fn())).toBe("actual code");
  expect(recover).toHaveBeenCalledOnce();
});
it("persistent failures preserve the cause and stop after bounded retries", async () => {
  const operation = vi.fn().mockRejectedValue(unavailable());
  await expect(retryInference(operation, vi.fn(), vi.fn())).rejects.toThrow("ECONNREFUSED");
  expect(operation).toHaveBeenCalledTimes(3);
  expect(connectionDetail(unavailable())).toContain("fetch failed");
});
it("does not retry validation or cancellation errors as connection errors", async () => {
  const operation = vi.fn().mockRejectedValue(new Error("invalid code"));
  await expect(retryInference(operation, vi.fn(), vi.fn())).rejects.toThrow("invalid code");
  expect(operation).toHaveBeenCalledOnce();
});
