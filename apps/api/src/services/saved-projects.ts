import fs from "node:fs/promises";
import path from "node:path";
import { readCheckpoint } from "@loom/agents";
import { repositoryRoot, workspaceRoot } from "./studio.js";

/** CLI projects also belong to the studio; never expose their full checkpoint context. */
export async function savedProject(id: string) {
  try {
    const checkpoint = readCheckpoint(id, repositoryRoot);
    if (!checkpoint) return null;
    const root = workspaceRoot(id);
    const stat = await fs.stat(path.join(root, "pipeline-checkpoint.json"));
    const prompt = typeof checkpoint.context.rawIdea === "string" ? checkpoint.context.rawIdea : "Saved project";
    const prd = await fs.readFile(path.join(root, "docs/PRD.md"), "utf8").catch(() => "");
    const heading = prd.match(/^#\s+(.+)$/m)?.[1];
    const summaryName = prd.match(/\n([A-Z][A-Za-z0-9 &'’-]{2,40}) (?:is|aims|provides)\b/)?.[1];
    const quotedName = prompt.match(/(?:for|called|named)\s+["'“]([^"'”]{2,50})["'”]/i)?.[1];
    const usableHeading = heading && !/requirements|PRD|product vision|document/i.test(heading) ? heading : undefined;
    const name = (usableHeading ?? quotedName ?? summaryName ?? prompt.split(/\n/)[0] ?? "Saved project").replace(/[*#`]/g, "").replace(/^Build\s+(?:a|an)\s+/i, "").slice(0, 90);
    return { id, name, description: prompt, founderPrompt: prompt,
      status: checkpoint.status === "completed" && checkpoint.phase === "code_gen" ? "completed" : checkpoint.status === "failed" ? "failed" : checkpoint.phase,
      techStack: null, architecture: null, repositoryUrl: null, deployedUrl: null, metadata: { source: "terminal" },
      createdAt: stat.birthtime, updatedAt: stat.mtime };
  } catch { return null; }
}
export async function savedProjects() {
  const entries = await fs.readdir(path.join(repositoryRoot, "runs/workspaces"), { withFileTypes: true }).catch(() => []);
  const values = await Promise.all(entries.filter(e => e.isDirectory() && !e.isSymbolicLink() && /^[0-9a-f-]{36}$/i.test(e.name)).map(e => savedProject(e.name)));
  return values.filter((p): p is NonNullable<typeof p> => p !== null);
}
