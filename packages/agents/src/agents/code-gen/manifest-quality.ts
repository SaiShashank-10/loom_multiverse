import type { FileStructure } from "./schema.js";

const moduleExtension = /\.(?:js|jsx|ts|tsx|mjs|cjs)$/i;

const behavioralTestPath = /(?:^|\/)(?:tests?|__tests__)\/|(?:^|[._-])(?:test|spec)\.[^/]+$|_test\.go$|Test\.java$/i;

/** Repair a missing test responsibility before source generation. The testing worker must
 * implement real assertions against the generated application; no fake passing source is supplied. */
export function completeBehavioralTests(manifest: FileStructure, framework?: string): FileStructure {
  const files = manifest.files.map(file => ({ ...file, path: file.path.replace(/\\/g, "/") }));
  if (files.some(file => behavioralTestPath.test(file.path))) return manifest;
  const flutter = files.find(file => /(?:^|\/)pubspec\.yaml$/.test(file.path));
  if (flutter) {
    const root = flutter.path.slice(0, -"pubspec.yaml".length);
    files.push({path: `${root}test/app_behavior_test.dart`, description: "Flutter widget behavioral tests: import the actual application, pump its providers, exercise primary navigation and form validation, and assert persisted user-visible state. Use flutter_test, real exports and mocked external services; no placeholder or unconditional passing assertions."});
    flutter.description += "; declare flutter_test as an SDK dev dependency and support flutter test";
  } else {
    const packages = files.filter(file => /(?:^|\/)package\.json$/.test(file.path));
    for (const pkg of packages) {
      const root = pkg.path.slice(0, -"package.json".length);
      const owned = files.filter(file => file.path.startsWith(root) && !packages.some(child => child !== pkg && child.path.startsWith(root) && file.path.startsWith(child.path.slice(0, -"package.json".length))));
      const source = owned.find(file => /(?:^|\/)(?:src\/)?[Aa]pp\.[jt]sx?$/.test(file.path)) ?? owned.find(file => /\.[jt]sx?$/.test(file.path));
      if (!source) continue;
      const native = /react[ -]?native|expo/i.test(framework ?? "") && !/backend|server|api/i.test(root);
      const ui = /\.[jt]sx$/.test(source.path);
      const extension = /\.tsx?$/.test(source.path) ? (ui ? "tsx" : "ts") : (ui ? "jsx" : "js");
      const runner = native ? "Jest with the approved React Native/Expo preset and @testing-library/react-native" : ui ? "Vitest with jsdom and @testing-library/react" : "Vitest";
      files.push({path: `${root}tests/app.behavior.test.${extension}`, description: `Executable behavioral tests using ${runner}. Import real application modules (${source.path}) and test the primary required user flow, validation failures and state changes. Follow actual peer exports/providers. Mock external network services only; never replace application behavior with a fake implementation, skip tests, or use unconditional assertions.`});
      pkg.description += `; declare ${runner} and all necessary dev dependencies; include a finite test script running these behavioral tests (no watch mode) and required test environment configuration`;
    }
    if (!packages.length && files.some(file => /\.py$/.test(file.path))) {
      files.push({path:"tests/test_application.py",description:"Pytest behavioral tests importing actual project modules; exercise the primary required workflow, validation and error handling. Mock unavailable external services, not application logic. Declare pytest in the project's development dependencies."});
    }
  }
  return { ...manifest, files };
}

/** Complete unambiguous browser bootstrap omissions without regenerating feature plans.
 * Only adds file responsibilities; the normal source workers implement and validate them.
 */
export function completeBrowserEntrypoints(
  manifest: FileStructure,
  framework?: string,
): FileStructure {
  if (/^(?:flutter|react[ -]?native|expo)$/i.test(framework ?? "")) return manifest;
  const files = manifest.files.map((file) => ({ ...file, path: file.path.replace(/\\/g, "/") }));
  const packages = files.filter((file) => /(?:^|\/)package\.json$/i.test(file.path));
  for (const pkg of packages) {
    const prefix = pkg.path.slice(0, -"package.json".length);
    const owned = files.filter(
      (file) =>
        file.path.startsWith(prefix) &&
        !packages.some(
          (child) =>
            child !== pkg &&
            child.path.startsWith(prefix) &&
            file.path.startsWith(child.path.slice(0, -"package.json".length)),
        ),
    );
    if (
      /react[ -]?native|\bexpo\b|\bnext(?:\.js|js)?\b|\bremix\b/i.test(pkg.description) ||
      owned.some((file) => /(?:^|\/)(?:next\.config\.|app\/_layout\.)/.test(file.path)) ||
      /^(?:next\.js|nextjs|remix)$/i.test(framework ?? "")
    )
      continue;
    const app = owned.find((file) => /^src\/App\.[jt]sx?$/.test(file.path.slice(prefix.length)));
    if (!app) continue;
    const extension = /\.tsx?$/.test(app.path) ? "tsx" : "jsx";
    let entry = owned.find((file) =>
      /^src\/(?:main|index)\.[jt]sx?$/.test(file.path.slice(prefix.length)),
    );
    if (!entry) {
      entry = {
        path: `${prefix}src/main.${extension}`,
        description: `Browser bootstrap: import the actual App export from ./${app.path.slice((prefix + "src/").length)}, import application styles, and mount App with react-dom/client createRoot into #root. Preserve required providers.`,
      };
      files.push(entry);
    }
    // CRA supplies its HTML under public and does not use a Vite module script.
    if (
      !owned.some(
        (file) => file.path === `${prefix}index.html` || file.path === `${prefix}public/index.html`,
      ) &&
      !/\b(?:react-scripts|create.react.app|webpack)\b/i.test(pkg.description)
    ) {
      files.push({
        path: `${prefix}index.html`,
        description: `HTML browser entry with viewport metadata, #root element and type=module script /${entry.path.slice(prefix.length)}. Match the application's title and favicon assets.`,
      });
      if (!owned.some((file) => /(?:^|\/)vite\.config\./.test(file.path)))
        files.push({
          path: `${prefix}vite.config.${extension === "tsx" ? "ts" : "js"}`,
          description:
            "Vite configuration using @vitejs/plugin-react; preserve approved API proxy and aliases and align with package.json scripts.",
        });
      pkg.description +=
        "; Vite React browser application: declare react, react-dom, vite and @vitejs/plugin-react; dev/start use vite, build uses vite build; include executable behavioral test scripts and needed test dependencies.";
    }
  }
  return { ...manifest, files };
}

/** Reject layouts that make imports nondeterministic or generate the same client twice. */
export function manifestQualityIssues(manifest: FileStructure, framework?: string): string[] {
  const issues: string[] = [];
  const paths = manifest.files.map((file) => file.path.replace(/\\/g, "/"));
  const native = /^(?:react[ -]?native|expo)$/i.test(framework ?? "");
  const flutter = /^flutter$/i.test(framework ?? "");
  const separateServer = (file: string) =>
    /(?:^|\/)(?:backend|server|functions|cloud-functions)\//i.test(file) ||
    /^(?:apps\/|packages\/)?api\//i.test(file);
  if (native) {
    const conflicting = paths.filter(
      (file) => !separateServer(file) && /\.dart$|(?:^|\/)pubspec\.ya?ml$/i.test(file),
    );
    if (conflicting.length)
      issues.push(`React Native client contains Flutter files: ${conflicting.join(", ")}`);
  }
  if (flutter) {
    const conflicting = paths.filter(
      (file) =>
        !separateServer(file) &&
        (/\.[jt]sx$/i.test(file) ||
          /(?:^|\/)(?:App\.[jt]s|(?:src\/)?(?:screens|components|navigation)\/[^/]+\.[jt]s)$/i.test(
            file,
          )),
    );
    if (conflicting.length)
      issues.push(
        `Flutter client contains JavaScript/React frontend files: ${conflicting.join(", ")}`,
      );
  }
  const moduleStems = new Map<string, string[]>();
  for (const file of paths.filter((file) => moduleExtension.test(file))) {
    const stem = file.replace(moduleExtension, "").toLowerCase();
    moduleStems.set(stem, [...(moduleStems.get(stem) ?? []), file]);
  }
  for (const files of moduleStems.values())
    if (files.length > 1) issues.push(`Conflicting module variants: ${files.join(", ")}`);

  const pathSet = new Set(paths.map((file) => file.toLowerCase()));
  if (
    paths.some((file) => /\.(?:js|jsx|ts|tsx|mjs|cjs)$/i.test(file)) &&
    !paths.some((file) => /(?:^|\/)package\.json$/i.test(file))
  )
    issues.push("JavaScript/TypeScript source has no package.json dependency and script manifest");
  for (const packageFile of manifest.files.filter((file) =>
    /(?:^|\/)package\.json$/i.test(file.path),
  )) {
    const directory = packageFile.path.replace(/\\/g, "/").replace(/(?:^|\/)package\.json$/i, "");
    const prefix = directory ? `${directory.toLowerCase()}/` : "";
    const scoped = paths
      .map((file) => file.toLowerCase())
      .filter((file) => file.startsWith(prefix))
      // Parent workspace package manifests do not own nested application sources.
      .filter(
        (file) =>
          !paths.some((candidate) => {
            const child = candidate.toLowerCase();
            return (
              child !== `${prefix}package.json` &&
              child.startsWith(prefix) &&
              child.endsWith("/package.json") &&
              file.startsWith(child.slice(0, -"package.json".length))
            );
          }),
      );
    const hasReactApp = scoped.some((file) => /(?:^|\/)src\/app\.[jt]sx?$/.test(file));
    const hasBrowserEntry = scoped.some((file) =>
      /(?:^|\/)src\/(?:main|index)\.[jt]sx?$/.test(file),
    );
    const nativePackage = native && !separateServer(packageFile.path.replace(/\\/g, "/"));
    if (hasReactApp && !hasBrowserEntry && !nativePackage)
      issues.push(`${packageFile.path}: React application has no src/main or src/index entrypoint`);
    if (nativePackage) {
      const relative = scoped.map((file) => file.slice(prefix.length));
      const hasApp = relative.some((file) => /^(?:src\/)?app\.[jt]sx?$/.test(file));
      const hasRouter = relative.some((file) => /^(?:src\/)?app\/_layout\.[jt]sx?$/.test(file));
      const hasRegistration = relative.some((file) => /^index\.[jt]s$/.test(file));
      const hasExpoConfig =
        relative.some((file) => /^app\.config\.[jt]s$/.test(file)) ||
        manifest.files.some(
          (file) =>
            file.path.replace(/\\/g, "/").toLowerCase() === `${prefix}app.json` &&
            /\bexpo\b/i.test(file.description),
        );
      const declaresExpoEntry = /\bexpo(?:[ -]router)?\b/i.test(packageFile.description);
      if (
        (hasApp || hasRouter || /react[ -]?native|\bexpo\b/i.test(packageFile.description)) &&
        !hasRegistration &&
        !(hasApp && (hasExpoConfig || declaresExpoEntry)) &&
        !(hasRouter && declaresExpoEntry)
      ) {
        issues.push(
          `${packageFile.path}: React Native application has no root index.js/index.ts registration entry or declared Expo application/router entry`,
        );
      }
    }
    if (
      /\bvite\b/i.test(packageFile.description) &&
      !scoped.some((file) => file === `${prefix}index.html`)
    )
      issues.push(`${packageFile.path}: Vite application has no index.html entrypoint`);
  }
  const generatedBinaryAssets = paths.filter((file) =>
    /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|pdf|mp[34]|zip|jar|keystore|jks)$/i.test(file),
  );
  if (generatedBinaryAssets.length)
    issues.push(
      `Text code generation cannot create binary assets; use source SVG/CSS or an existing supplied asset: ${generatedBinaryAssets.join(", ")}`,
    );
  for (const file of paths) {
    const normalized = file.toLowerCase();
    const nested = normalized.match(/^(?:src\/)?frontend\/src\/(.+)$/)?.[1];
    if (nested && pathSet.has(`src/${nested}`))
      issues.push(
        `Duplicate frontend layouts: ${file} and src/${file.split(/frontend\/src\//i)[1]}`,
      );
  }

  const descriptions = manifest.files.map((file) => file.description).join("\n");
  if (
    /\b(?:placeholder|implementation goes here|text describing|explanation instead of code)\b/i.test(
      descriptions,
    )
  )
    issues.push("Manifest contains placeholder file descriptions");
  if (
    !paths.some((file) =>
      /(?:^|\/)(?:tests?|__tests__)\/|(?:^|[._-])(?:test|spec)\.[^/]+$|_test\.go$|Test\.java$/i.test(
        file,
      ),
    )
  )
    issues.push("Manifest has no behavioral test file");
  return [...new Set(issues)];
}
