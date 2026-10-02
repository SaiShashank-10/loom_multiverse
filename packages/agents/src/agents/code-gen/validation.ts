import fs from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { lstatSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseDocument } from "yaml";
const flutterManifest = (text: string) =>
  parseDocument(text).getIn(["dependencies", "flutter", "sdk"]) === "flutter";

const execute = promisify(exec);
const usesWatchMode = (command: string) =>
  /--watch(?:all)?(?:\s|$|=(?!false(?:\s|$)))/i.test(command);
const excluded = new Set([
  "source-audit.json",
  "validation-report.json",
  "architecture-progress.json",
  "architecture-progress.json.tmp",
  ".loom-backups",
  ".loom-design",
  ".loom-mobile",
  "project-target.json",
  "artifacts",
  "ml-run.json",
  "ml-plan.json",
  "ml-plan.json.tmp",
  "ml-execution-report.json",
  "pipeline-checkpoint.json",
  "pipeline-checkpoint.json.tmp",
  "codegen-manifest.json",
  "idea-analysis.json",
  "node_modules",
  ".git",
  ".dart_tool",
  ".expo",
  ".idea",
  "build",
  "dist",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  "vendor",
  "target",
  "docs",
  ".gradle",
  ".cxx",
  ".kotlin",
  "Pods",
  "data",
]);
export interface Check {
  cwd: string;
  command: string;
  stage: "install" | "validate";
}
export interface ValidationResult {
  success: boolean;
  checks: Check[];
  error?: string;
  attempts: number;
}

export function safePath(root: string, relative: string): string {
  if (
    !relative ||
    path.isAbsolute(relative) ||
    path.win32.isAbsolute(relative) ||
    /[:"<>|&`$]/.test(relative)
  )
    throw new Error(`Unsafe project path: ${relative}`);
  const normalized = relative.replace(/\\/g, "/");
  if (
    normalized
      .split("/")
      .some(
        (p) =>
          [
            "source-audit.json",
            "validation-report.json",
            "architecture-progress.json",
            "architecture-progress.json.tmp",
            "ml-run.json",
            "ml-plan.json",
            "ml-plan.json.tmp",
            "ml-execution-report.json",
            "pipeline-checkpoint.json",
            "pipeline-checkpoint.json.tmp",
            "codegen-manifest.json",
            "idea-analysis.json",
          ].includes(p) ||
          p === ".." ||
          p === ".git" ||
          p === ".loom-backups" ||
          p === ".loom-design" ||
          p === ".loom-mobile" ||
          p === "project-target.json" ||
          p === "node_modules" ||
          (p.startsWith(".env") && ![".env.example", ".env.template"].includes(p)),
      )
  )
    throw new Error(`Protected project path: ${relative}`);
  const full = path.resolve(root, normalized);
  if (!full.startsWith(path.resolve(root) + path.sep))
    throw new Error(`Path escapes project: ${relative}`);
  let ancestor = full;
  while (ancestor !== path.resolve(root)) {
    try {
      if (lstatSync(ancestor).isSymbolicLink())
        throw new Error(`Symlink in project write path: ${relative}`);
    } catch (error: any) {
      if (error.code !== "ENOENT") throw error;
    }
    ancestor = path.dirname(ancestor);
  }
  return full;
}

export async function projectFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(dir: string, depth: number) {
    if (depth > 12) throw new Error("Project nesting exceeds inspection limit");
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (
        entry.isSymbolicLink() ||
        (entry.name.startsWith(".env") &&
          ![".env.example", ".env.template"].includes(entry.name)) ||
        excluded.has(entry.name)
      )
        continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, depth + 1);
      else files.push(path.relative(root, full).replace(/\\/g, "/"));
    }
  }
  await walk(root, 0);
  return files.sort();
}

export async function discoverChecks(
  root: string,
  options: { nativeMobile?: boolean } = {},
): Promise<Check[]> {
  const files = await projectFiles(root);
  const checks: Check[] = [];
  const nativeRoots: string[] = [];
  for (const file of files.filter((f) => f.endsWith("package.json"))) {
    const pkg = JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
    if (pkg.dependencies?.["react-native"])
      nativeRoots.push(file.replace(/package.json$/, "android/"));
  }
  const add = (cwd: string, stage: Check["stage"], command: string) =>
    checks.push({ cwd, stage, command });
  // Extension point for other toolchains; commands remain visible in the validation report.
  if (files.includes("loom.validation.json")) {
    const config = JSON.parse(await fs.readFile(path.join(root, "loom.validation.json"), "utf8"));
    if (!Array.isArray(config.projects) || !config.projects.length)
      throw new Error("loom.validation.json requires projects");
    for (const p of config.projects) {
      const cwd = p.directory === "." ? root : safePath(root, p.directory);
      if (!Array.isArray(p.validate) || !p.validate.length)
        throw new Error("Each validation project needs at least one validate command");
      for (const stage of ["install", "validate"] as const)
        for (const command of p[stage] ?? []) {
          if (
            typeof command !== "string" ||
            !command.trim() ||
            /^(echo|true|exit\s+0)\b|\b(?:run\s+dev|runserver)\b/.test(command) ||
            usesWatchMode(command)
          )
            throw new Error("Invalid validation command");
          add(cwd, stage, command);
        }
    }
    // A custom app validation manifest must not omit the generated ML component.
    if (files.includes("ml/requirements.txt")) {
      const cwd = path.join(root, "ml");
      const python =
        process.platform === "win32" ? ".venv\\Scripts\\python.exe" : ".venv/bin/python";
      add(cwd, "install", "python -m venv .venv");
      add(cwd, "install", `${python} -m pip install -r requirements.txt`);
      add(cwd, "validate", `${python} -m pytest`);
    }
    return checks;
  }
  for (const file of files) {
    const name = path.basename(file),
      cwd = path.dirname(path.join(root, file));
    const local = (name: string) =>
      files.includes(path.relative(root, path.join(cwd, name)).replace(/\\/g, "/"));
    if (name === "pubspec.yaml") {
      const flutter = flutterManifest(await fs.readFile(path.join(root, file), "utf8"));
      add(cwd, "install", flutter ? "flutter pub get" : "dart pub get");
      add(cwd, "validate", flutter ? "flutter analyze" : "dart analyze");
      if (files.some((f) => f.startsWith(file.replace(/pubspec.yaml$/, "test/"))))
        add(cwd, "validate", flutter ? "flutter test" : "dart test");
      if (flutter && !options.nativeMobile && local("web/index.html"))
        add(cwd, "validate", "flutter build web");
    } else if (name === "package.json") {
      const pkg = JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
      const manager = String(
        pkg.packageManager ??
          (local("pnpm-lock.yaml")
            ? "pnpm"
            : local("yarn.lock")
              ? "yarn"
              : local("bun.lock") || local("bun.lockb")
                ? "bun"
                : "npm"),
      ).split("@")[0]!;
      if (!["npm", "pnpm", "yarn", "bun"].includes(manager))
        throw new Error(`Unsupported package manager: ${manager}`);
      const scripts = pkg.scripts ?? {};
      const source = files.filter(
        (f) => path.dirname(path.join(root, f)) === cwd && /\.(m?js|cjs)$/.test(f),
      );
      // A workspace coordinator with no source is not a build target.
      if (
        !Object.keys(pkg.dependencies ?? {}).length &&
        !Object.keys(scripts).length &&
        !source.length &&
        files.some((f) => f !== file && /\/(package.json|pubspec.yaml)$/.test(f))
      )
        continue;
      if (manager === "npm" && /"(?:patch|workspace):/.test(JSON.stringify(pkg)))
        throw new Error(
          `${file}: npm cannot install patch:/workspace: protocols; select the intended package manager or correct the manifest`,
        );
      add(cwd, "install", `${manager} install`);
      let validated = false;
      for (const script of ["typecheck", "lint", "build", "test"])
        if (
          scripts[script] &&
          !/no test specified|echo\s/i.test(scripts[script]) &&
          !usesWatchMode(scripts[script])
        ) {
          add(cwd, "validate", `${manager} run ${script}`);
          validated = true;
        }
      // Typechecking alone does not resolve native assets/imports; Expo must bundle Android too.
      if (pkg.dependencies?.expo) {
        add(cwd, "validate", "npx --no-install expo export --platform android");
        validated = true;
      }
      if (!validated && (pkg.dependencies?.expo || pkg.dependencies?.["react-native"])) {
        if (pkg.dependencies?.expo) {
          add(cwd, "validate", "npx --no-install expo export");
          validated = true;
        } else if (local("tsconfig.json")) {
          add(cwd, "validate", "npx --no-install tsc --noEmit");
          validated = true;
        }
      }
      if (!validated && source.length) {
        for (const f of source) add(cwd, "validate", `node --check "${path.basename(f)}"`);
        validated = true;
      }
      if (!validated && local("tsconfig.json")) {
        add(cwd, "validate", "npx --no-install tsc --noEmit");
        validated = true;
      }
      if (!validated)
        throw new Error(
          `${file}: no usable validation script. Add a real check or loom.validation.json; do not invent webpack.`,
        );
    } else if (
      name === "pyproject.toml" ||
      (name === "requirements.txt" && !local("pyproject.toml"))
    ) {
      add(cwd, "install", "python -m venv .venv");
      const python =
        process.platform === "win32" ? ".venv\\Scripts\\python.exe" : ".venv/bin/python";
      add(
        cwd,
        "install",
        `${python} -m pip install ${name === "requirements.txt" ? "-r requirements.txt" : "."}`,
      );
      add(cwd, "validate", `${python} -m compileall -q -x "[\\\\/](.venv|venv)[\\\\/]" .`);
      if (files.some((f) => f.startsWith(file.replace(/[^/]+$/, "tests/"))))
        add(cwd, "validate", `${python} -m pytest`);
    } else if (name === "Cargo.toml") {
      add(cwd, "install", "cargo fetch");
      add(cwd, "validate", "cargo check");
      add(cwd, "validate", "cargo test");
    } else if (name === "go.mod") {
      add(cwd, "install", "go mod download");
      add(cwd, "validate", "go build ./...");
      add(cwd, "validate", "go test ./...");
    } else if (name === "pom.xml") {
      const mvn =
        local("mvnw.cmd") && process.platform === "win32"
          ? "mvnw.cmd"
          : local("mvnw")
            ? "./mvnw"
            : "mvn";
      add(cwd, "validate", `${mvn} verify`);
    } else if (name === "build.gradle" || name === "build.gradle.kts") {
      // Native Android wrappers are built through their owning mobile runtime.
      if (nativeRoots.some((prefix) => file.startsWith(prefix))) continue;
      if (
        files.some(
          (f) =>
            f.endsWith("pubspec.yaml") && file.startsWith(f.replace("pubspec.yaml", "android/")),
        )
      )
        continue;
      const gradle =
        process.platform === "win32" && local("gradlew.bat")
          ? "gradlew.bat"
          : local("gradlew")
            ? "./gradlew"
            : "gradle";
      add(cwd, "validate", `${gradle} build`);
    } else if (name === "composer.json") {
      add(cwd, "install", "composer install --no-interaction");
      add(cwd, "validate", "composer validate --strict");
      const pkg = JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
      if (pkg.scripts?.test) add(cwd, "validate", "composer run-script test");
      else
        for (const f of files.filter(
          (f) => f.endsWith(".php") && path.join(root, f).startsWith(cwd + path.sep),
        ))
          add(cwd, "validate", `php -l "${path.relative(cwd, path.join(root, f))}"`);
    } else if (name === "Gemfile") {
      add(cwd, "install", "bundle install");
      add(cwd, "validate", "bundle exec rake test");
    } else if (name === "Package.swift") {
      add(cwd, "install", "swift package resolve");
      add(cwd, "validate", "swift build");
      add(cwd, "validate", "swift test");
    } else if (name === "CMakeLists.txt") {
      add(cwd, "install", "cmake -S . -B build");
      add(cwd, "validate", "cmake --build build");
    } else if (name.endsWith(".csproj")) {
      add(cwd, "install", `dotnet restore "${name}"`);
      add(cwd, "validate", `dotnet build "${name}" --no-restore`);
    }
  }
  if (!checks.some((c) => c.stage === "validate"))
    throw new Error(
      "No supported validation target found. Supply loom.validation.json for this toolchain.",
    );
  return checks;
}

export async function runCheck(check: Check, env?: NodeJS.ProcessEnv): Promise<void> {
  const configuredMinutes = Number(process.env.LOOM_VALIDATION_TIMEOUT_MINUTES ?? 20);
  const timeoutMinutes = Number.isFinite(configuredMinutes)
    ? Math.min(120, Math.max(1, configuredMinutes))
    : 20;
  try {
    await execute(check.command, {
      cwd: check.cwd,
      env,
      timeout: timeoutMinutes * 60_000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (error: any) {
    throw new Error(`${error.message}\n${error.stdout ?? ""}\n${error.stderr ?? ""}`);
  }
}

export async function validateAndHeal(
  root: string,
  heal: (check: Check, error: string) => Promise<boolean>,
  run = runCheck,
  notify: (message: string) => void = () => {},
  verify: () => Promise<void> = async () => {},
  options: { nativeMobile?: boolean } = {},
): Promise<ValidationResult> {
  let checks: Check[] = [],
    lastError = "";
  const seen = new Set<string>();
  const dependencyRecoveries = new Set<string>();
  for (let attempt = 1; attempt <= 5; attempt++) {
    let current: Check = {
      cwd: root,
      command: "Discover project validation targets",
      stage: "validate",
    };
    try {
      await verify();
      checks = await discoverChecks(root, options);
      if (!checks.some((check) => check.stage === "validate"))
        throw new Error("No executable validation checks were discovered");
      // Reinstall on every repair cycle: dependency changes must take effect before compilation.
      for (const stage of ["install", "validate"] as const)
        for (const check of checks.filter((c) => c.stage === stage)) {
          current = check;
          notify(`[${attempt}/5] ${path.relative(root, check.cwd) || "."}: ${check.command}`);
          await run(check);
        }
      return { success: true, checks, attempts: attempt };
    } catch (error) {
      lastError = String(error);
      notify(
        lastError.length > 5000
          ? `${lastError.slice(0, 3000)}\n...\n${lastError.slice(-2000)}`
          : lastError,
      );
      // Missing SDKs, credentials, connectivity are environment blockers, not source-code bugs.
      if (
        /not recognized as an internal|command not found|ENOENT|ENOTFOUND|EAI_AGAIN|401 Unauthorized|403 Forbidden/.test(
          lastError,
        ) &&
        !/webpack|vite|tsc/.test(lastError)
      )
        return {
          success: false,
          checks,
          error: `Environment prerequisite: ${lastError}`,
          attempts: attempt,
        };
      const signature = createHash("sha256")
        .update(current.command + lastError)
        .digest("hex");
      if (seen.has(signature) || attempt === 5)
        return { success: false, checks, error: lastError, attempts: attempt };
      seen.add(signature);
      // FlutterFire 3.11.0 used a JS interop API unavailable on Dart < 3.12.
      // Resolve the upstream fix within the project's declared constraints once,
      // then rerun every check. Never patch the SDK or shared package cache.
      if (
        /^flutter build web\b/.test(current.command) &&
        /firebase_core_web[\s\S]*The method 'isA' isn't defined/.test(lastError) &&
        !dependencyRecoveries.has(current.cwd)
      ) {
        dependencyRecoveries.add(current.cwd);
        notify(
          "Updating firebase_core_web within declared constraints to repair its Dart interop compilation error.",
        );
        try {
          await run({
            ...current,
            command: "flutter pub upgrade firebase_core_web",
            stage: "install",
          });
          continue;
        } catch (dependencyError) {
          lastError += `\nDependency recovery failed: ${String(dependencyError)}`;
        }
      }
      if (!(await heal(current, lastError)))
        return { success: false, checks, error: lastError, attempts: attempt };
    }
  }
  return { success: false, checks, error: lastError, attempts: 5 };
}

/** Apply explicit framework choices in user messages in chronological order. */
export function requiredFramework(requirements: string): string | undefined {
  const matches = [
    ...requirements.matchAll(
      /\b(flutter|react native|next\.js|nextjs|react|vue(?:\.js)?|angular|svelte|django|fastapi|flask|spring boot|laravel|ruby on rails|rails|express|node(?:\.js)?|rust|golang|go|asp\.net|\.net|kotlin|swift)\b/gi,
    ),
  ];
  const selected = matches
    .filter((match) => {
      const before = requirements.slice(Math.max(0, match.index! - 45), match.index).toLowerCase();
      return !/\b(?:not|never|no|without|instead of|rather than|replace)\s*$/.test(before);
    })
    .map((match) => match[1]!.toLowerCase());
  // A separate backend requirement must not erase the user's client framework.
  return (
    selected
      .filter((name) =>
        [
          "flutter",
          "react native",
          "next.js",
          "nextjs",
          "react",
          "vue",
          "vue.js",
          "angular",
          "svelte",
          "kotlin",
          "swift",
        ].includes(name),
      )
      .at(-1) ?? selected.at(-1)
  );
}

export function assertRequiredStructure(framework: string | undefined, files: string[]): void {
  const requirements: Record<string, RegExp[]> = {
    flutter: [/(^|\/)pubspec.yaml$/, /(^|\/)lib\/main.dart$/],
    "react native": [/(^|\/)package.json$/, /\.[jt]sx?$/],
    "next.js": [/(^|\/)package.json$/, /\.[jt]sx?$/],
    nextjs: [/(^|\/)package.json$/, /\.[jt]sx?$/],
    react: [/(^|\/)package.json$/, /(^|\/)src\/App\.[jt]sx?$/],
    vue: [/(^|\/)package.json$/, /\.vue$/],
    "vue.js": [/(^|\/)package.json$/, /\.vue$/],
    angular: [/(^|\/)angular.json$/, /(^|\/)package.json$/],
    svelte: [/(^|\/)package.json$/, /\.svelte$/],
    django: [/(^|\/)manage.py$/, /(?:requirements.txt|pyproject.toml)$/],
    fastapi: [/\.py$/, /(?:requirements.txt|pyproject.toml)$/],
    flask: [/\.py$/, /(?:requirements.txt|pyproject.toml)$/],
    "spring boot": [/(?:pom.xml|build.gradle(?:.kts)?)$/, /\.(?:java|kt)$/],
    laravel: [/(^|\/)composer.json$/, /(^|\/)artisan$/],
    "ruby on rails": [/(^|\/)Gemfile$/, /(^|\/)config\/routes.rb$/],
    rails: [/(^|\/)Gemfile$/, /(^|\/)config\/routes.rb$/],
    express: [/(^|\/)package.json$/, /\.[jt]s$/],
    node: [/(^|\/)package.json$/, /\.[cm]?[jt]s$/],
    "node.js": [/(^|\/)package.json$/, /\.[cm]?[jt]s$/],
    rust: [/(^|\/)Cargo.toml$/, /\.rs$/],
    golang: [/(^|\/)go.mod$/, /\.go$/],
    go: [/(^|\/)go.mod$/, /\.go$/],
    "asp.net": [/\.csproj$/, /\.cs$/],
    ".net": [/\.csproj$/, /\.cs$/],
    kotlin: [/(?:build.gradle|build.gradle.kts)$/, /\.kt$/],
    swift: [/(^|\/)Package.swift$/, /\.swift$/],
  };
  if ((requirements[framework ?? ""] ?? []).some((pattern) => !files.some((f) => pattern.test(f))))
    throw new Error(`Generated structure does not implement required framework ${framework}`);
}

export async function assertRequiredWorkspace(
  root: string,
  framework: string | undefined,
): Promise<void> {
  const files = await projectFiles(root);
  assertRequiredStructure(framework, files);
  if (framework === "flutter") {
    const manifests = files.filter((f) => f.endsWith("pubspec.yaml"));
    const contents = await Promise.all(
      manifests.map((f) => fs.readFile(safePath(root, f), "utf8")),
    );
    if (!contents.some((c) => flutterManifest(c)))
      throw new Error("Required Flutter SDK is missing from pubspec.yaml");
    for (const file of files.filter((f) => f.endsWith("package.json"))) {
      const pkg = JSON.parse(await fs.readFile(safePath(root, file), "utf8"));
      if (pkg.dependencies?.["react-native"] || pkg.dependencies?.expo)
        throw new Error("React Native/Expo cannot replace the approved Flutter client");
    }
  }
  if (framework === "react native") {
    for (const file of files.filter((f) => f.endsWith("pubspec.yaml"))) {
      if (flutterManifest(await fs.readFile(safePath(root, file), "utf8")))
        throw new Error("Flutter cannot replace the approved React Native client");
    }
  }
  const dependencyFor: Record<string, string> = {
    "react native": "react-native",
    "next.js": "next",
    nextjs: "next",
    react: "react",
    vue: "vue",
    "vue.js": "vue",
    angular: "@angular/core",
    svelte: "svelte",
    express: "express",
  };
  const requiredDependency = dependencyFor[framework ?? ""];
  if (requiredDependency) {
    const manifests = files.filter((file) => file.endsWith("package.json"));
    const packages = await Promise.all(
      manifests.map(async (file) => ({
        file,
        value: JSON.parse(await fs.readFile(safePath(root, file), "utf8")),
      })),
    );
    if (
      !packages.some(
        ({ value }) =>
          value.dependencies?.[requiredDependency] || value.devDependencies?.[requiredDependency],
      )
    )
      throw new Error(
        `Required ${framework} dependency ${requiredDependency} is missing from generated package manifests`,
      );
  }
}
