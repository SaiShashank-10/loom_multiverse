import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import treeKill from "tree-kill";
import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { launch, stopManagedProcess } from "./mobile-runtime.js";
import { projectFiles, safePath } from "./validation.js";
const serviceSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  directory: z.string(),
  file: z.string().min(1),
  args: z.array(z.string()),
  healthUrl: z.string().url(),
});
export const localServicesSchema = z
  .object({ services: z.array(serviceSchema).max(8) })
  .superRefine(({ services }, context) => {
    const names = new Set<string>();
    for (const service of services) {
      const url = new URL(service.healthUrl);
      if (
        url.protocol !== "http:" ||
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
        url.username ||
        url.password
      )
        context.addIssue({
          code: "custom",
          message: "Service health checks must use local HTTP without credentials",
        });
      if (names.has(service.name))
        context.addIssue({ code: "custom", message: "Service names must be unique" });
      names.add(service.name);
    }
  });
const owned = new Map<string, ChildProcess>();
async function stop(child: ChildProcess) {
  if (child.pid)
    await new Promise<void>((resolve) => treeKill(child.pid!, "SIGTERM", () => resolve()));
}
/** Explicit launch commands and observed health keep backend availability separate from native build success. */
export async function startLocalServices(
  root: string,
  env: NodeJS.ProcessEnv,
  notify: (message: string) => void,
): Promise<number[]> {
  const files = await projectFiles(root);
  const config = path.join(root, "loom.services.json");
  let raw: string;
  try {
    raw = await fs.readFile(config, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    if (
      files.some((file) =>
        /(?:^|\/)(?:backend|server|api)\/(?:package.json|requirements.txt|pyproject.toml)$/.test(
          file,
        ),
      )
    )
      throw new Error(
        "Local backend requires loom.services.json with explicit executable, args, working directory and a real HTTP health route.",
      );
    return [];
  }
  const plan = localServicesSchema.parse(JSON.parse(raw));
  const started: ChildProcess[] = [];
  const ports: number[] = [];
  try {
    for (const service of plan.services) {
      const key = root + "::" + service.name;
      const previous = owned.get(key);
      if (previous) {
        await stop(previous);
        owned.delete(key);
      }
      await stopManagedProcess(root, `${service.name}.process.json`, env);
      let occupied = false;
      try {
        const response = await fetch(service.healthUrl, {
          signal: AbortSignal.timeout(1000),
          redirect: "manual",
        });
        await response.body?.cancel();
        occupied = true;
      } catch {}
      if (occupied)
        throw new Error(
          `Service ${service.name} health endpoint is already served by a process not started by this attempt`,
        );
      const cwd = service.directory === "." ? root : safePath(root, service.directory);
      const log = path.join(root, ".loom-mobile", service.name + ".log");
      await fs.mkdir(path.dirname(log), { recursive: true });
      const handle = await fs.open(log, "a");
      const token = `loom-mobile-${randomUUID()}`;
      let executable = service.file === "node" ? process.execPath : service.file;
      let args = service.args;
      if (process.platform === "win32" && !/\.exe$/i.test(executable)) {
        const quote = (text: string) => `'${text.replace(/'/g, "''")}'`;
        const script = `& ${[executable, ...args].map(quote).join(" ")}\nexit $LASTEXITCODE`;
        executable = "powershell.exe";
        args = [
          "-NoProfile",
          "-NonInteractive",
          "-EncodedCommand",
          Buffer.from(script, "utf16le").toString("base64"),
        ];
      }
      const supervisor =
        "const {spawn}=require('node:child_process');const c=JSON.parse(Buffer.from(process.argv[1],'base64'));const p=spawn(c.file,c.args,{cwd:c.cwd,env:process.env,windowsHide:true,stdio:'inherit'});p.on('error',e=>{console.error(e);process.exit(1)});p.on('exit',code=>process.exit(code??1));";
      const command = Buffer.from(JSON.stringify({ file: executable, args, cwd })).toString(
        "base64",
      );
      const child = launch(
        { file: process.execPath, args: [`--title=${token}`, "-e", supervisor, command], cwd, env },
        true,
        handle.fd,
      );
      await fs.writeFile(
        path.join(root, ".loom-mobile", `${service.name}.process.json`),
        JSON.stringify({ pid: child.pid, token }),
      );
      await handle.close();
      let spawnError: Error | undefined;
      child.on("error", (error) => {
        spawnError = error;
      });
      started.push(child);
      owned.set(key, child);
      notify(`Starting local service ${service.name}; checking ${service.healthUrl}.`);
      const deadline = Date.now() + 60_000;
      let healthy = false;
      while (Date.now() < deadline && child.exitCode === null && !spawnError) {
        try {
          const response = await fetch(service.healthUrl, {
            signal: AbortSignal.timeout(2000),
            redirect: "error",
          });
          await response.body?.cancel();
          if (response.ok) {
            healthy = true;
            break;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (!healthy)
        throw new Error(
          `Service ${service.name} did not become healthy: ${spawnError ?? (await fs.readFile(log, "utf8")).slice(-5000)}`,
        );
      child.unref();
      ports.push(Number(new URL(service.healthUrl).port || 80));
    }
    return [...new Set(ports)];
  } catch (error) {
    for (const child of started) await stop(child);
    for (const [key, child] of owned) if (started.includes(child)) owned.delete(key);
    throw error;
  }
}

export async function stopLocalServices(root: string): Promise<void> {
  for (const [key, child] of owned)
    if (key.startsWith(root + "::")) {
      await stop(child);
      owned.delete(key);
    }
}
