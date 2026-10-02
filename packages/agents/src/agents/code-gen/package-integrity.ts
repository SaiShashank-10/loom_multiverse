import fs from "node:fs/promises";
import path from "node:path";
import { builtinModules, isBuiltin } from "node:module";
import type { Check } from "./validation.js";
import { projectFiles, safePath } from "./validation.js";

type PackageJson = Record<string, any>;

const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
const sourcePattern = /\.(?:[cm]?[jt]sx?)$/i;

function packageName(specifier: string): string | undefined {
  if (
    !specifier ||
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("#")
  )
    return undefined;
  if (isBuiltin(specifier) || builtins.has(specifier)) return undefined;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function imports(source: string): string[] {
  const values = new Set<string>();
  const patterns = [
    /\b(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns)
    for (const match of source.matchAll(pattern)) {
      const name = packageName(match[1]!);
      if (name) values.add(name);
    }
  return [...values];
}

function major(version: unknown): number | undefined {
  const match = String(version ?? "").match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function allDependencies(pkg: PackageJson): Record<string, string> {
  return {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
    ...(pkg.optionalDependencies ?? {}),
  };
}

function withinPackage(file: string, directory: string, nestedRoots: string[]): boolean {
  const prefix = directory === "." ? "" : `${directory}/`;
  if (!file.startsWith(prefix)) return false;
  return !nestedRoots.some((root) => root !== directory && file.startsWith(`${root}/`));
}

/**
 * Check cross-file Node invariants that syntax-only validation cannot see. Package managers
 * still perform the authoritative dependency resolution during the install stage.
 */
export async function assertNodePackageIntegrity(root: string): Promise<void> {
  const files = await projectFiles(root);
  const manifests = files.filter((file) => path.posix.basename(file) === "package.json");
  const roots = manifests.map((file) => path.posix.dirname(file));
  for (const manifest of manifests) {
    const directory = path.posix.dirname(manifest);
    const pkg = JSON.parse(await fs.readFile(safePath(root, manifest), "utf8")) as PackageJson;
    const dependencies = allDependencies(pkg);
    const scopedFiles = files.filter(
      (file) => sourcePattern.test(file) && withinPackage(file, directory, roots),
    );
    const missing = new Set<string>();
    for (const file of scopedFiles) {
      const source = await fs.readFile(safePath(root, file), "utf8");
      for (const imported of imports(source))
        if (!(imported in dependencies)) missing.add(imported);
    }
    if (missing.size)
      throw new Error(
        `${manifest}: imported packages missing from dependencies: ${[...missing].sort().join(", ")}`,
      );

    const react = major(dependencies.react);
    for (const companion of ["react-dom", "react-test-renderer"])
      if (react && major(dependencies[companion]) && major(dependencies[companion]) !== react)
        throw new Error(
          `${manifest}: react major ${react} conflicts with ${companion} major ${major(dependencies[companion])}`,
        );
    const testingLibrary = major(dependencies["@testing-library/react"]);
    if (testingLibrary && testingLibrary >= 13 && react && react < 18)
      throw new Error(
        `${manifest}: @testing-library/react ${testingLibrary} requires React 18 or newer; generated React major is ${react}`,
      );

    const scripts = Object.values(pkg.scripts ?? {}).join("\n");
    const tools: Array<[RegExp, string]> = [
      [/\bvitest\b/, "vitest"],
      [/\bvite\b/, "vite"],
      [/\bjest\b/, "jest"],
      [/\breact-scripts\b/, "react-scripts"],
      [/\bnext\b/, "next"],
      [/\bwebpack\b/, "webpack"],
      [/\beslint\b/, "eslint"],
      [/\btsc\b/, "typescript"],
    ];
    const absentTools = tools
      .filter(([pattern, dependency]) => pattern.test(scripts) && !(dependency in dependencies))
      .map(([, dependency]) => dependency);
    if (absentTools.length)
      throw new Error(
        `${manifest}: script tools missing from dependencies: ${absentTools.join(", ")}`,
      );

    const local = (relative: string) =>
      files.includes(directory === "." ? relative : `${directory}/${relative}`);
    if (/\bvite\b/.test(scripts) && !local("index.html"))
      throw new Error(`${manifest}: Vite scripts require an index.html application entrypoint`);
    if (
      /\breact-scripts\b/.test(scripts) &&
      !["src/index.js", "src/index.jsx", "src/index.ts", "src/index.tsx"].some(local)
    )
      throw new Error(
        `${manifest}: react-scripts requires a src/index.js or equivalent entrypoint`,
      );

    if (/\bvitest\b/.test(String(pkg.scripts?.test ?? ""))) {
      const jestGlobals: string[] = [];
      for (const file of scopedFiles.filter((file) => /(?:^|\.)test\.[cm]?[jt]sx?$/i.test(file))) {
        const source = await fs.readFile(safePath(root, file), "utf8");
        if (
          /\bjest\s*\./.test(source) &&
          !/\bimport\s*\{[^}]*\bvi\b[^}]*\}\s*from\s*["']vitest["']/.test(source)
        )
          jestGlobals.push(file);
      }
      if (jestGlobals.length)
        throw new Error(
          `${manifest}: Vitest test script conflicts with Jest globals in ${jestGlobals.slice(0, 5).join(", ")}`,
        );
    }
  }
}

function manifestForCheck(root: string, check: Check): string {
  return path.join(check.cwd || root, "package.json");
}

/** Repair the exact peer range npm reports instead of asking an LLM to guess across ecosystems. */
export async function repairNodePeerConflict(
  root: string,
  check: Check,
  output: string,
): Promise<boolean> {
  if (
    !/\b(?:npm|pnpm|yarn|bun)\s+install\b/.test(check.command) ||
    !/ERESOLVE|peer dep(?:endency)?/i.test(output)
  )
    return false;
  const peer = output.match(/peer\s+(@?[\w.-]+(?:\/[\w.-]+)?)@"([^"]+)"\s+from/i);
  if (!peer) return false;
  const manifestPath = manifestForCheck(root, check);
  let pkg: PackageJson;
  try {
    pkg = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    return false;
  }
  const dependency = peer[1]!;
  const requested = peer[2]!;
  const section = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ].find((name) => pkg[name]?.[dependency] !== undefined);
  if (!section || pkg[section][dependency] === requested) return false;
  pkg[section][dependency] = requested;

  // React packages share one runtime ABI. Keep direct companions on the peer's requested major.
  if (dependency === "react") {
    const requestedMajor = major(requested);
    if (requestedMajor)
      for (const companion of [
        "react-dom",
        "react-test-renderer",
        "@types/react",
        "@types/react-dom",
      ])
        for (const name of ["dependencies", "devDependencies"])
          if (pkg[name]?.[companion] !== undefined) pkg[name][companion] = `^${requestedMajor}.0.0`;
  }
  await fs.writeFile(manifestPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  return true;
}
