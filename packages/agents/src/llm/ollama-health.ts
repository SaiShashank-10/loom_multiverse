import { spawn } from "node:child_process";
import { config } from "@loom/shared/config";
export function connectionDetail(error: unknown): string {
  const parts: string[] = [];
  let current = error as any;
  for (let depth = 0; current && depth < 4; depth++, current = current.cause) {
    if (current.message) parts.push(String(current.message));
    if (current.code) parts.push(String(current.code));
    if (Array.isArray(current.errors))
      for (const child of current.errors) if (child.code) parts.push(String(child.code));
  }
  return [...new Set(parts)].join("; ") || String(error);
}
export function transientConnection(error: unknown): boolean {
  return /fetch failed|ECONNREFUSED|ECONNRESET|EPIPE|ETIMEDOUT|UND_ERR_SOCKET|socket hang up|temporarily unavailable/i.test(
    connectionDetail(error),
  );
}
async function startLocalServer(origin: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("ollama", ["serve"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, OLLAMA_HOST: origin },
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}
export async function ensureOllamaReady(
  baseUrl = config.OLLAMA_BASE_URL,
  model = config.OLLAMA_MODEL,
  notify: (message: string) => void = () => {},
  dependencies = {
    fetch: globalThis.fetch,
    start: startLocalServer,
    wait: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  },
) {
  const base = new URL(baseUrl);
  const endpoint = new URL(`${baseUrl.replace(/\/$/, "")}/api/tags`);
  const local =
    ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname) &&
    ["", "/"].includes(base.pathname);
  let last: unknown;
  let started = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const response = await dependencies.fetch(endpoint, { signal: AbortSignal.timeout(3000) });
      if (!response.ok) throw new Error(`Ollama readiness HTTP ${response.status}`);
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      if (!Array.isArray(data.models)) throw new Error("Invalid Ollama model-list response");
      const wanted = model.includes(":") ? model : `${model}:latest`;
      if (!data.models.some((item) => item.name === model || item.name === wanted))
        throw new Error(`Required model ${model} is not installed. Run: ollama pull ${model}`);
      return;
    } catch (error) {
      last = error;
      if (/not installed|HTTP|Invalid Ollama/.test(connectionDetail(error))) throw error;
      if (local && !started) {
        started = true;
        notify("Ollama is unavailable. Starting its local server and waiting for readiness...");
        try {
          await dependencies.start(base.origin);
        } catch (startError) {
          throw new Error(
            `Cannot start Ollama: ${connectionDetail(startError)}. Start Ollama manually, then resume the same project.`,
          );
        }
      }
      if (attempt < 9) await dependencies.wait(1000);
    }
  }
  throw new Error(
    `Ollama is unreachable at ${base.origin}: ${connectionDetail(last)}. Start Ollama (ollama serve), verify OLLAMA_BASE_URL, then resume the same project. Saved files are preserved.`,
  );
}
/** Retry only inference connection failures, independently of code/schema correction attempts. */
export async function retryInference<T>(
  operation: () => Promise<T>,
  recover: () => Promise<void> = () => ensureOllamaReady(),
  wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!transientConnection(error)) throw error;
      if (attempt === 3)
        throw new Error(
          `Ollama connection failed after 3 attempts: ${connectionDetail(error)}. Resume the same project after restoring Ollama; generated files are preserved.`,
        );
      await recover();
      await wait(attempt * 500);
    }
  }
  throw new Error("No inference result");
}
