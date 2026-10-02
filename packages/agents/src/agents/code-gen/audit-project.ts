import fs from "node:fs/promises";
import path from "node:path";
import { auditSources } from "./source-audit.js";
import { FileStructureSchema } from "./schema.js";

async function main() {
  if (!process.argv[2])
    throw new Error(
      "Usage: npx tsx --env-file=.env packages/agents/src/agents/code-gen/audit-project.ts <project-directory>",
    );
  const root = path.resolve(process.argv[2]);
  let manifest: Array<{ path: string }> = [];
  try {
    manifest = FileStructureSchema.parse(
      JSON.parse(await fs.readFile(path.join(root, "codegen-manifest.json"), "utf8")),
    ).files;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const report = await auditSources(root, manifest);
  await fs.writeFile(path.join(root, "source-audit.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      { ...report.counts, warnings: report.warnings, report: path.join(root, "source-audit.json") },
      null,
      2,
    ),
  );
  process.exitCode = report.success ? 0 : 1;
}
main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
