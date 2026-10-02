import { FileStructureSchema, type FileStructure } from "./schema.js";
import { safePath } from "./validation.js";

/** Normalize generated proposals, never relax the protections on actual workspace writes. */
export function prepareManifest(value: unknown, root: string): FileStructure {
  const manifest = FileStructureSchema.parse(value);
  const files = new Map<string, FileStructure["files"][number]>();
  for (const proposed of manifest.files) {
    let filePath = proposed.path.replace(/\\/g, "/").replace(/^(?:\.\/)+/, "");
    const parts = filePath.split("/");
    const basename = parts.at(-1)!;
    let description = proposed.description;
    if (/^\.env(?:\.|$)/i.test(basename)) {
      // One template per component avoids collisions between .env and .env.local proposals.
      parts[parts.length - 1] =
        basename.toLowerCase() === ".env.template" ? ".env.template" : ".env.example";
      filePath = parts.join("/");
      description =
        "Environment configuration template. List all variable names needed by this component with empty values or obvious placeholders and explanatory comments. Never include real credentials, copy an existing .env, or invent working API keys. The user creates their own local environment file from this template.";
    }
    safePath(root, filePath); // Traversal, metadata, symlinks and protected directories remain rejected.
    const key = filePath.toLowerCase();
    const previous = files.get(key);
    files.set(key, {
      path: previous?.path ?? filePath,
      description: previous
        ? [...new Set([previous.description, description])].join("; ")
        : description,
    });
  }
  return FileStructureSchema.parse({ files: [...files.values()] });
}
