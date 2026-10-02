import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { safePath } from "./validation.js";

/** Diagnostics belong to the exact rejected candidate, never to a newer disk edit. */
export function currentDraftIssues(source: string | undefined, draft?: { source: string; issues: string[] }): string[] {
  return draft && (source === undefined || source === draft.source) ? draft.issues : [];
}

/** Give native reviewers implementation evidence, not just exported class names. */
export async function nativeReviewDependencies(root: string, file: string, source: string): Promise<string> {
  if (!file.endsWith(".dart")) return "";
  const parts: string[] = [];
  let remaining = 18000;
  for (const match of source.matchAll(/(?:import|export)\s+['"]([^'"]+)['"]/g)) {
    const specifier = match[1]!;
    if (specifier.includes(":")) continue;
    const relative = path.posix.normalize(path.posix.join(path.posix.dirname(file.replace(/\\/g, "/")), specifier));
    const full = safePath(root, relative);
    try {
      const text = await fs.readFile(full, "utf8");
      if (text.length > remaining) {
        parts.push(`${relative}: imported dependency exists; implementation omitted for context budget. Do not infer its widgets are absent.`);
      } else {
        parts.push(`DEPENDENCY ${relative} (context only, not under review):\n${text}`);
        remaining -= text.length;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      parts.push(`${relative}: unavailable; dependency resolution is checked by flutter analyze.`);
    }
  }
  try {
    const pubspec = await fs.readFile(safePath(root, "pubspec.yaml"), "utf8");
    parts.push(`ASSET/FONT REGISTRATION:\n${pubspec.slice(0, 6000)}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  try {
    const assets = JSON.parse(await fs.readFile(path.join(root, ".loom-design/asset-manifest.json"), "utf8"));
    if (Array.isArray(assets)) {
      let assetBudget = 14000;
      for (const asset of assets) {
        if (typeof asset.asset !== "string" || typeof asset.url !== "string" || typeof asset.sha256 !== "string") continue;
        const bytes = await fs.readFile(safePath(root, asset.asset));
        if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256) continue;
        const mapping = `${asset.asset} = ${asset.url}`;
        if (mapping.length > assetBudget) { parts.push("Additional asset mappings omitted; do not infer incorrect imagery from an unknown local path."); break; }
        parts.push(`VERIFIED BUNDLED ASSET: ${mapping}`);
        assetBudget -= mapping.length;
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }
  return parts.join("\n");
}
