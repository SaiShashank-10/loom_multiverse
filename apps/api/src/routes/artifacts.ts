import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { workspaceRoot } from "../services/studio.js";
import { readCheckpoint } from "@loom/agents";
import { repositoryRoot } from "../services/studio.js";

const artifactsRouter = new Hono();
artifactsRouter.use("/:id/*", async (c, next) => {
  if (!z.string().uuid().safeParse(c.req.param("id")).success)
    return c.json({ success: false, error: { message: "Invalid project ID" } }, 400);
  return next();
});
const excluded =
  /^(?:node_modules|\.git|\.env.*|\.loom.*|build|dist|\.dart_tool|uploads|pipeline-checkpoint\.json)$/i;
async function files(root: string, relative = "", result: string[] = []) {
  const entries = await fs
    .readdir(path.join(root, relative), { withFileTypes: true })
    .catch(() => []);
  for (const entry of entries) {
    if (excluded.test(entry.name) || entry.isSymbolicLink() || result.length >= 1000) continue;
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) await files(root, name, result);
    else if (
      /\.(?:md|txt|json|ya?ml|[cm]?[jt]sx?|dart|css|html|py|toml|sql|kt|java|swift)$/i.test(name)
    )
      result.push(name);
  }
  return result;
}
artifactsRouter.get("/:id/files", async (c) =>
  c.json({ success: true, data: await files(workspaceRoot(c.req.param("id"))) }),
);
artifactsRouter.get("/:id/file", async (c) => {
  const root = workspaceRoot(c.req.param("id"));
  const name = c.req.query("path") ?? "";
  if (!(await files(root)).includes(name))
    return c.json({ success: false, error: { message: "File not available" } }, 404);
  const target = await fs.realpath(path.join(root, name));
  if (!target.startsWith((await fs.realpath(root)) + path.sep))
    return c.json({ success: false, error: { message: "Invalid file" } }, 400);
  if ((await fs.stat(target)).size > 256000)
    return c.json({ success: false, error: { message: "File is too large to preview" } }, 413);
  return c.json({
    success: true,
    data: { path: name, content: await fs.readFile(target, "utf8") },
  });
});
artifactsRouter.get("/:id/designs", async (c) => {
  const root = workspaceRoot(c.req.param("id"));
  const reference = await fs
    .readFile(path.join(root, ".loom-design/reference.json"), "utf8")
    .then(JSON.parse)
    .catch(() => ({ screens: [] }));
  const checkpoint = readCheckpoint(c.req.param("id"), repositoryRoot);
  const stitch = checkpoint?.context.stitch as
    { screens?: Record<string, any>[]; url?: string } | undefined;
  const project = await fs
    .readFile(path.join(root, "docs/STITCH_PROJECT.json"), "utf8")
    .then(JSON.parse)
    .catch(() => ({}));
  const source = reference.screens?.length ? reference.screens : (stitch?.screens ?? []);
  return c.json({
    success: true,
    data: {
      url: stitch?.url ?? project.url,
      screens: source.map((s: Record<string, any>) => ({
        id: s.id,
        title: s.title ?? s.name,
        device: s.device ?? s.deviceType,
        screenshotUrl: [s.screenshotUrl, s.screenshot?.downloadUrl].find(
          (v) => typeof v === "string" && v.startsWith("https://"),
        ),
      })),
    },
  });
});
artifactsRouter.post("/:id/documents", bodyLimit({ maxSize: 10 * 1024 * 1024 }), async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File) || !/\.(?:txt|md|pdf|docx)$/i.test(file.name))
    return c.json(
      {
        success: false,
        error: { message: "Choose a TXT, Markdown, PDF or DOCX file under 10 MB" },
      },
      400,
    );
  const dir = path.join(workspaceRoot(c.req.param("id")), "uploads");
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomUUID()}${path.extname(file.name).toLowerCase()}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return c.json({ success: true, data: { name: file.name } }, 201);
});
export { artifactsRouter };
