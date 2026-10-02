import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertNodePackageIntegrity, repairNodePeerConflict } from "./package-integrity.js";

const roots: string[] = [];
async function fixture(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loom-package-integrity-"));
  roots.push(root);
  for (const [name, value] of Object.entries(files)) {
    const full = path.join(root, name);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, value);
  }
  return root;
}
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

describe("Node package integrity", () => {
  it("recognizes prefix-only Node builtins without asking npm or the model to install them", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({ name: "app", scripts: { test: "node --test" } }),
      "tests/api.test.mjs":
        "import test from 'node:test'; import assert from 'node:assert/strict'; test('works',()=>assert.equal(1,1));",
    });
    await expect(assertNodePackageIntegrity(root)).resolves.toBeUndefined();
  });
  it("finds undeclared imports, absent script tools, and missing Vite entries", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({
        name: "app",
        scripts: { build: "vite build" },
        dependencies: { react: "^18.2.0" },
      }),
      "src/App.jsx": "import axios from 'axios'; export default () => <main />;",
    });
    await expect(assertNodePackageIntegrity(root)).rejects.toThrow("axios");
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
    pkg.dependencies.axios = "^1.0.0";
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify(pkg));
    await expect(assertNodePackageIntegrity(root)).rejects.toThrow("vite");
    pkg.devDependencies = { vite: "^6.0.0" };
    await fs.writeFile(path.join(root, "package.json"), JSON.stringify(pkg));
    await expect(assertNodePackageIntegrity(root)).rejects.toThrow("index.html");
  });

  it("rejects incompatible React companions and Jest globals under Vitest", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({
        name: "app",
        scripts: { test: "vitest run" },
        dependencies: {
          react: "^17.0.2",
          "react-dom": "^17.0.2",
          "@testing-library/react": "^13.4.0",
        },
        devDependencies: { vitest: "^3.0.0" },
      }),
      "src/App.test.js": "jest.mock('./x'); test('x', () => {});",
    });
    await expect(assertNodePackageIntegrity(root)).rejects.toThrow("requires React 18");
  });

  it("repairs the npm-reported peer and synchronizes React companions", async () => {
    const root = await fixture({
      "package.json": JSON.stringify({
        name: "app",
        dependencies: { react: "^17.0.2", "react-dom": "^17.0.2" },
        devDependencies: { "@types/react": "^17.0.0" },
      }),
    });
    expect(
      await repairNodePeerConflict(
        root,
        { cwd: root, command: "npm install", stage: "install" },
        'ERESOLVE Could not resolve dependency: peer react@"^18.0.0" from @testing-library/react@13.4.0',
      ),
    ).toBe(true);
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
    expect(pkg.dependencies.react).toBe("^18.0.0");
    expect(pkg.dependencies["react-dom"]).toBe("^18.0.0");
    expect(pkg.devDependencies["@types/react"]).toBe("^18.0.0");
  });
});
