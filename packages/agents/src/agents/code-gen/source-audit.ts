import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { projectFiles, safePath } from "./validation.js";
import { validateSource, validateFilePurpose } from "./source-output.js";

export interface AuditEntry {
  path: string;
  bytes: number;
  sha256: string;
  status: "valid" | "invalid" | "documentation" | "asset" | "missing";
  reason?: string;
}
export async function auditSources(root: string, manifest: Array<{ path: string }> = []) {
  const discovered = await projectFiles(root);
  const names = [...new Set([...discovered, ...manifest.map((file) => file.path)])].sort();
  const entries: AuditEntry[] = [];
  const structure = manifest.map((file) => file.path).join("\n");
  for (const file of names) {
    let bytes: Buffer;
    try {
      bytes = await fs.readFile(safePath(root, file));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      entries.push({
        path: file,
        bytes: 0,
        sha256: "",
        status: "missing",
        reason: "Manifest file has not been generated",
      });
      continue;
    }
    const base = {
      path: file,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    if (
      /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|mp[34]|zip|lock|jar|keystore|jks)$/i.test(file) ||
      /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|bun\.lockb?)$/i.test(file)
    ) {
      entries.push({ ...base, status: "asset" });
      continue;
    }
    try {
      validateSource(file, bytes.toString("utf8"));
      validateFilePurpose(file, bytes.toString("utf8"), structure);
      entries.push({
        ...base,
        status:
          /\.(?:md|txt)$/i.test(file) && !/requirements.*\.txt$/i.test(file)
            ? "documentation"
            : "valid",
      });
    } catch (error) {
      // Reports store diagnostics and hashes, never raw file contents or credentials.
      entries.push({ ...base, status: "invalid", reason: String(error).slice(0, 600) });
    }
  }
  const invalid = entries.filter(
    (entry) => entry.status === "invalid" || entry.status === "missing",
  );
  const duplicates = new Map<string, string[]>();
  for (const file of names.filter((name) => /\.[jt]sx?$/.test(name))) {
    const stem = file.replace(/\.[jt]sx?$/, "").toLowerCase();
    duplicates.set(stem, [...(duplicates.get(stem) ?? []), file]);
  }
  return {
    success: invalid.length === 0,
    checkedAt: new Date().toISOString(),
    counts: {
      total: entries.length,
      invalid: invalid.length,
      valid: entries.filter((e) => e.status === "valid").length,
    },
    warnings: [...duplicates.values()]
      .filter((group) => group.length > 1)
      .map(
        (group) =>
          `Overlapping module paths: ${group.join(", ")}. Verify consumers import the intended file.`,
      ),
    entries,
  };
}

export async function assertSourceAudit(root: string, manifest: Array<{ path: string }> = []) {
  const report = await auditSources(root, manifest);
  await fs.writeFile(path.join(root, "source-audit.json"), JSON.stringify(report, null, 2));
  if (!report.success) {
    const failures = report.entries.filter((entry) =>
      ["invalid", "missing"].includes(entry.status),
    );
    throw new Error(
      `Source audit failed (${failures.length} files):\n${failures
        .slice(0, 12)
        .map((entry) => `${entry.path}: ${entry.reason}`)
        .join("\n")}`,
    );
  }
}

/** Move invalid files left by an older manifest aside; valid unlisted user work is preserved. */
export async function quarantineInvalidOrphans(
  root: string,
  manifest: Array<{ path: string }>,
): Promise<string[]> {
  const expected = new Set(manifest.map((file) => file.path.replace(/\\/g, "/").toLowerCase()));
  const report = await auditSources(root, manifest);
  const orphans = report.entries.filter(
    (entry) => entry.status === "invalid" && !expected.has(entry.path.toLowerCase()),
  );
  if (!orphans.length) return [];
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  for (const entry of orphans) {
    const source = safePath(root, entry.path);
    const backup = path.join(root, ".loom-backups", stamp, "orphaned", entry.path);
    await fs.mkdir(path.dirname(backup), { recursive: true });
    await fs.rename(source, backup);
  }
  return orphans.map((entry) => entry.path);
}
