import { it, expect } from "vitest";
import { reconcileTrainingFiles } from "./manifest-reconciliation.js";
const manifest = {
  files: [
    { path: "src/preprocess.py", description: "dataset preparation" },
    { path: "src/train.py", description: "model training" },
    { path: "src/config.json", description: "dataset paths" },
    { path: "src/routes/auth.js", description: "application routes" },
  ],
};
it("removes training leftovers outside ml/ from a web-only plan", () => {
  const result = reconcileTrainingFiles(manifest, false, "React Node.js Express portfolio");
  expect(result.manifest.files.map((f) => f.path)).toEqual(["src/routes/auth.js"]);
  expect(result.removed).toHaveLength(3);
});
it("retains real ML workloads and Python services", () => {
  expect(reconcileTrainingFiles(manifest, true, "GNN training").removed).toHaveLength(0);
  expect(reconcileTrainingFiles(manifest, false, "React Python API").removed).toHaveLength(0);
});

it("does not mistake rejected Python alternatives for the chosen stack", () => {
  expect(
    reconcileTrainingFiles(
      manifest,
      false,
      "React Node.js Express portfolio\nOptions Considered: Python Flask",
    ).removed,
  ).toHaveLength(3);
});
