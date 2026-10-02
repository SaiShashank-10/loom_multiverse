import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import ts from "typescript";
import { createTier2LLM } from "../../llm/index.js";
import { generateSource, validatedCurrentSource, type SourceEvidence } from "./source-output.js";
import { reviewDesignSource } from "./design-review.js";

export type MobileFramework = "flutter" | "react-native";
const roles = {
  ui: "Mobile UI and navigation engineer. Translate the approved Stitch visual hierarchy, tokens, assets and responsive layouts into native widgets/components. Implement safe areas, keyboard handling, accessibility labels, loading/empty/error states, navigation parameters and back behavior. Preserve peer exports and shared styling contracts.",
  data: "Mobile state and data engineer. Implement the approved state transitions, repository interfaces and real local persistence. Connect configured APIs using the supplied contracts, cancellation, validation and actionable error handling. Never fabricate credentials, authentication success or server data. Keep secrets out of the client; distinguish unavailable configuration from successful operations. Implement offline behavior only where required.",
  platform:
    "Mobile platform and build engineer. Implement compatible dependency manifests, native entry points, permissions, environment configuration and real build/run commands for the approved runtime. Request only permissions required by features. Preserve existing package identifiers and platform configuration; do not claim a successful build or device launch from source generation.",
  testing:
    "Mobile behavioral test and integration engineer. Exercise user-visible navigation, state transitions, persistence across repository recreation, validation and API failure behavior with the approved test runtime. Mock only external boundaries, not the behavior under test. No unconditional assertions, disabled tests or fabricated execution results.",
} as const;
export type MobileRole = keyof typeof roles;

function normalized(file: string) {
  return file.replace(/\\/g, "/");
}

/** Separate servers and ML work belong to their own teams, even in mobile repositories. */
export function isMobileClientFile(file: string, framework: MobileFramework): boolean {
  const name = normalized(file);
  if (
    /(^|\/)(?:backend|server|functions|cloud-functions|ml|models-training|training|notebooks)\//i.test(
      name,
    ) ||
    /^(?:apps\/|packages\/)?api\//i.test(name)
  )
    return false;
  if (/\.(?:py|ipynb|sql|go|rs)$/i.test(name)) return false;
  // Deliberately include a conflicting client manifest/source so it is rejected, not silently routed elsewhere.
  return (
    /\.(?:dart|[cm]?[jt]sx?|json|ya?ml|gradle|kts?|java|swift|plist|xml|properties|xcconfig|css|html)$/i.test(
      name,
    ) ||
    /(?:^|\/)(?:Podfile|Gemfile|\.env\.(?:example|template))$/.test(name) ||
    (framework === "flutter" && /(?:^|\/)\.metadata$/.test(name))
  );
}

export function mobileRole(file: string): MobileRole {
  const name = normalized(file);
  if (
    /(^|\/)(?:test|tests|__tests__|integration_test|e2e)\/|(?:_test\.dart|\.(?:test|spec)\.[jt]sx?)$/i.test(
      name,
    )
  )
    return "testing";
  if (
    /(^|\/)(?:android|ios)\/|(?:pubspec\.ya?ml|package\.json|Podfile|Gemfile|\.config\.[^.]+|app\.json|\.env\.(?:example|template))$/i.test(
      name,
    )
  )
    return "platform";
  if (
    /(^|\/)(?:data|state|store|stores|providers|repositories|services|api|models|hooks)\/|(?:repository|service|provider|notifier|bloc|cubit|store)\.[^.]+$/i.test(
      name,
    )
  )
    return "data";
  return "ui";
}

function stackContract(framework: MobileFramework) {
  return framework === "flutter"
    ? "LOCKED CLIENT STACK: Flutter. Application code is Dart with Flutter widgets; dependencies are in pubspec.yaml and tests use flutter_test/integration_test. Native Android/iOS host files are permitted. Never replace the app with React Native, React DOM, HTML, CSS, Vite or a WebView wrapper. Implement native layouts corresponding to Stitch HTML references; references are visual evidence, not target source."
    : "LOCKED CLIENT STACK: React Native. Use React Native primitives, StyleSheet and the approved navigation/state libraries. Preserve the approved Expo versus bare React Native runtime from project requirements and peer configuration; never switch runtimes to bypass errors. Tests use the configured native test runtime. Never generate Flutter/Dart or substitute React DOM, HTML, Vite or a WebView wrapper for mobile UI. Stitch HTML is visual evidence to translate into native components.";
}

/** Check executable syntax/imports, not incidental words in UI copy or comments. */
export function assertMobileStack(file: string, source: string, framework: MobileFramework): void {
  const name = normalized(file);
  if (!isMobileClientFile(name, framework)) return;
  const fail = (why: string): never => {
    throw new Error(`${file}: ${framework} client stack violation: ${why}`);
  };
  if (framework === "react-native" && /\.dart$|(?:^|\/)pubspec\.ya?ml$/i.test(name))
    fail("Flutter client file");
  if (/\.(?:html|css)$/i.test(name))
    fail("web-only client source; translate the design to native UI");
  if (framework === "flutter" && /\.[jt]sx$/i.test(name))
    fail("JSX client source in a Flutter app");
  if (/\.[cm]?[jt]sx?$/i.test(name)) {
    const ast = ts.createSourceFile(
      name,
      source,
      ts.ScriptTarget.Latest,
      true,
      /x$/i.test(name) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const visit = (node: ts.Node) => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        checkImport(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === "require")) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        checkImport(node.arguments[0].text);
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        if (/^[a-z]/.test(node.tagName.getText(ast))) fail("DOM/custom HTML element in native UI");
      }
      ts.forEachChild(node, visit);
    };
    const checkImport = (module: string) => {
      if (/^(?:react-dom|react-router-dom|vite|next)(?:\/|$)/.test(module))
        fail(`web runtime import ${module}`);
      if (framework === "flutter" && /^(?:react|react-native|expo)(?:\/|$)/.test(module))
        fail(`React runtime import ${module}`);
    };
    visit(ast);
  }
  if (
    /\.dart$/i.test(name) &&
    /^\s*(?:import|export)\s+['"](?:dart:html|package:(?:react|react_native)\/)/m.test(source)
  )
    fail("web/React import in Dart application");
  if (/package\.json$/i.test(name)) {
    const manifest = JSON.parse(source);
    const deps = { ...manifest.dependencies, ...manifest.devDependencies };
    if (framework === "flutter" && ["react", "react-native", "expo"].some((dep) => dep in deps))
      fail("React dependencies in Flutter client");
    if (["vite", "next", "react-router-dom"].some((dep) => dep in deps))
      fail("web application runtime dependencies");
    // Expo web support can legitimately include react-dom/react-native-web; do not reject optional targets.
  }
  if (/\.(?:java|kt|swift)$/i.test(name)) {
    if (framework === "flutter" && /^\s*import\s+(?:com\.facebook\.react|React\b)/m.test(source))
      fail("React Native host import");
    if (framework === "react-native" && /^\s*import\s+(?:io\.flutter|Flutter\b)/m.test(source))
      fail("Flutter host import");
  }
}

export class MobileWorkerTeam {
  private workers = new Map<MobileRole, BaseChatModel>();
  constructor(
    private framework: MobileFramework,
    private factory: () => BaseChatModel = () =>
      createTier2LLM({ maxTokens: 8192, contextWindow: 16384, temperature: 0.1 }),
  ) {}

  async generate(
    file: { path: string; description: string },
    context: string,
    evidence: SourceEvidence,
  ): Promise<string> {
    if (!isMobileClientFile(file.path, this.framework))
      throw new Error(`${file.path}: route non-mobile source to its application/backend worker`);
    // A conflicting path cannot be repaired by writing another language into that same filename.
    assertMobileStack(file.path, /package\.json$/i.test(file.path) ? "{}" : "", this.framework);
    const role = mobileRole(file.path);
    if (!this.workers.has(role)) this.workers.set(role, this.factory());
    const llm = this.workers.get(role)!;
    const instruction = `${roles[role]}\n${stackContract(this.framework)}`;
    let nextEvidence = {
      ...evidence,
      constraints: `${evidence.constraints ?? ""}\n${stackContract(this.framework)}`,
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      let source =
        (attempt === 0 ? validatedCurrentSource(file.path, nextEvidence) : undefined) ??
        (await generateSource(llm, file, context, instruction, nextEvidence));
      try {
        assertMobileStack(file.path, source, this.framework);
        source = await reviewDesignSource(llm, file, source, context, instruction, nextEvidence);
        assertMobileStack(file.path, source, this.framework);
        return source;
      } catch (error) {
        if (
          attempt === 1 ||
          !(error instanceof Error) ||
          !error.message.includes("client stack violation")
        )
          throw error;
        nextEvidence = {
          ...nextEvidence,
          currentFile: source,
          constraints: `${nextEvidence.constraints}\nRequired correction: ${error.message}. Rewrite using only the locked native stack.`,
        };
      }
    }
    throw new Error(`${file.path}: mobile generation exhausted corrections`);
  }
}
