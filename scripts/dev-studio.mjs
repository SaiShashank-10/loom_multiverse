import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
if (!existsSync(".env") || !existsSync("packages/agents/dist/index.js")) {
  console.error(
    "LOOM needs its .env and built workspace packages. Run pnpm install, then pnpm build:studio first.",
  );
  process.exit(1);
}
for (const port of [3001, 5174]) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", () =>
      reject(
        new Error(
          `Port ${port} is in use. Close the previous LOOM server before starting another.`,
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  }).catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    if (process.platform === "win32")
      spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore",
      });
    else child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500);
}
function launch(args, cwd = root) {
  const child = spawn(process.execPath, args, { cwd, stdio: "inherit", windowsHide: true });
  children.push(child);
  child.once("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.once("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
launch([
  "apps/api/node_modules/tsx/dist/cli.mjs",
  "watch",
  "--env-file=.env",
  "apps/api/src/index.ts",
]);
launch(
  [
    path.join(root, "apps/web/node_modules/vite/bin/vite.js"),
    "--host",
    "127.0.0.1",
    "--port",
    "5174",
  ],
  path.join(root, "apps/web"),
);
console.log("LOOM studio: http://127.0.0.1:5174 · Ctrl+C stops both servers.");
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
