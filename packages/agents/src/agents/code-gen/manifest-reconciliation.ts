import type { FileStructure } from "./schema.js";
import { mlFiles } from "./ml-workers.js";
/** Remove only identifiable training leftovers from plans that do not request training. */
export function reconcileTrainingFiles(
  manifest: FileStructure,
  needsTraining: boolean,
  approvedContext: string,
) {
  if (needsTraining) return { manifest, removed: [] as FileStructure["files"] };
  const injected = new Set(mlFiles.map((file) => file.path));
  const selectedContext = approvedContext
    .replace(/\\n/g, "\n")
    .split("\n")
    .filter(
      (line) => !/options considered|alternatives considered|rejected alternative/i.test(line),
    )
    .join("\n");
  const webOnly =
    /\b(?:react|node\.?js|express|vue)\b/i.test(selectedContext) &&
    !/\bpython\b/i.test(selectedContext);
  const removed: FileStructure["files"] = [];
  const files = manifest.files.filter((file) => {
    const normalized = file.path.replace(/\\/g, "/");
    const stale =
      injected.has(normalized) ||
      (webOnly &&
        (/(?:^|\/)(?:[^/]*(?:preprocess|finetun|train|evaluate|predict)[^/]*|model)\.py$/i.test(
          normalized,
        ) ||
          (/\.py$/i.test(normalized) &&
            /\b(?:model training|preprocessing|pretrained|dataset|training pipeline)\b/i.test(
              file.description,
            )) ||
          (/(?:^|\/)config\.json$/i.test(normalized) && /\bdatasets?\b/i.test(file.description))));
    if (stale) removed.push(file);
    return !stale;
  });
  return { manifest: { files }, removed };
}
