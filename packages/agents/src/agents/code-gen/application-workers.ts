import path from "node:path";
import ts from "typescript";
import postcss from "postcss";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createTier2LLM } from "../../llm/index.js";
import { generateSource, validatedCurrentSource, type SourceEvidence } from "./source-output.js";
import { reviewDesignSource } from "./design-review.js";
import { styleContract } from "./style-contract.js";

const roles = {
  configuration:
    "Build and configuration engineer. Implement real scripts, dependency versions, entry points and environment templates for the approved stack. Match the supplied file paths; build and test commands must perform real checks.",
  frontend:
    "Frontend engineer. Reproduce the actual supplied Stitch layouts, tokens, typography, spacing and responsive variants in the required framework. Implement the full visible hierarchy, shared navigation and styled loading/error/empty states. Match existing API clients, component exports and stylesheet selectors. Do not substitute static mock interactions for backend operations.",
  backend:
    "Backend engineer. Implement the approved services, validation, persistence and error handling. Match existing models and API consumers. Keep credentials on the server and report missing external-service configuration honestly.",
  testing:
    "Test engineer. Test observable behavior and integration contracts, including error cases. Do not write unconditional passing tests, bypass authentication, or mock the behavior being tested.",
  integration:
    "Application integration engineer. Implement shared models, utilities and entry points using the approved stack and exact peer interfaces. Preserve error handling and avoid side effects on import unless this is the application entry point.",
} as const;
export type ApplicationRole = keyof typeof roles;

export function applicationRole(file: string): ApplicationRole {
  if (/(^|\/)(?:tests?|__tests__)\/|\.(?:test|spec)\./i.test(file)) return "testing";
  if (
    /(?:package\.json|pubspec\.yaml|requirements.*\.txt|pyproject\.toml|Cargo\.toml|go\.mod|\.config\.[\w]+|\.env\.(?:example|template))$/i.test(
      file,
    )
  )
    return "configuration";
  if (/(^|\/)(?:backend|server|controllers?|routes?|middleware|database)\//i.test(file))
    return "backend";
  if (
    /(^|\/)(?:frontend|components?|screens?|pages?|styles?|widgets?)\/|\.(?:jsx|tsx|vue|svelte|css|scss|html|dart|swift|kt)$|(?:^|\/)(?:App|Layout|theme)\.[jt]s$/i.test(
      file,
    )
  )
    return "frontend";
  return "integration";
}

/** Keep signatures from every validated file, even after its implementation leaves the prompt window. */
export function sourceInterface(file: string, content: string): string {
  if (/\.css$/i.test(file)) {
    const root = postcss.parse(content);
    const selectors = new Set<string>();
    const tokens: string[] = [];
    root.walkRules((rule) => {
      selectors.add(rule.selector);
    });
    root.walkDecls((decl) => {
      if (decl.prop.startsWith("--")) tokens.push(`${decl.prop}: ${decl.value}`);
    });
    return `Available selectors: ${[...selectors].join("; ")}\nDesign tokens: ${tokens.join("; ")}`;
  }
  if (/\.[cm]?[jt]sx?$/.test(file)) {
    const source = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".ts") ? ts.ScriptKind.TS : ts.ScriptKind.TSX,
    );
    return source.statements
      .map((statement) => {
        if (ts.isFunctionDeclaration(statement) && statement.body)
          return (
            statement.getText(source).slice(0, statement.body.pos - statement.getStart(source)) +
            " { /* implementation omitted */ }"
          );
        if (ts.isClassDeclaration(statement))
          return `class ${statement.name?.text ?? "default"} { ${statement.members
            .map((member) => member.getText(source).split("{")[0]!.slice(0, 180))
            .join("; ")} }`;
        return statement.getText(source).slice(0, 500);
      })
      .join("\n");
  }
  if (file.endsWith(".py"))
    return content
      .split(/\r?\n/)
      .filter((line) => /^(?:from |import |def |class |async def |[A-Z_]\w*\s*=)/.test(line))
      .join("\n");
  return content.slice(0, 1600);
}

export class InterfaceIndex {
  private entries = new Map<string, string>();
  private styles = new Map<string, string>();
  add(file: string, content: string) {
    this.entries.set(file, sourceInterface(file, content));
    if (/\.css$|(?:^|\/)package\.json$/.test(file)) this.styles.set(file, content);
  }
  stylingFor(file: string) {
    return styleContract(this.styles, file);
  }
  forFile(file: string, description: string): string {
    const terms = `${file} ${description}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((term) => term.length > 3);
    return [...this.entries]
      .filter(([name]) => name !== file)
      .map(([name, content]) => {
        const stem = path
          .basename(name)
          .replace(/\.[^.]+$/, "")
          .toLowerCase();
        return {
          name,
          content,
          score:
            (terms.includes(stem) ? 20 : 0) +
            (path.dirname(name) === path.dirname(file) ? 5 : 0) +
            (applicationRole(file) === "frontend" && /\.(?:css|scss)$/.test(name) ? 25 : 0) +
            (/package\.json$|(?:common|types|config|api)\./.test(name) ? 8 : 0) +
            terms.filter((term) => `${name}\n${content}`.toLowerCase().includes(term)).length,
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 8)
      .map(
        ({ name, content }) =>
          `--- ${name} ---\n${content.slice(0, /\.css$/.test(name) ? 2000 : 950)}`,
      )
      .join("\n")
      .slice(0, 5500);
  }
}

/** Stable prerequisite ordering; workers remain sequential to share each validated result. */
export function orderSourceFiles<T extends { path: string }>(files: T[]): T[] {
  const priority = (file: string) =>
    applicationRole(file) === "configuration"
      ? 0
      : /\.(?:css|scss)$|(?:common|types|model|config|utils|styles)[/.]/i.test(file)
        ? 1
        : /(?:^|\/)(?:App|index|main|server)\.[^.]+$/.test(file)
          ? 4
          : applicationRole(file) === "testing"
            ? 5
            : 2;
  return files
    .map((file, index) => ({ file, index }))
    .sort((a, b) => priority(a.file.path) - priority(b.file.path) || a.index - b.index)
    .map(({ file }) => file);
}

export class ApplicationWorkerTeam {
  private workers = new Map<ApplicationRole, BaseChatModel>();
  constructor(
    private factory = () =>
      createTier2LLM({ maxTokens: 8192, contextWindow: 16384, temperature: 0.1 }),
  ) {}
  async generate(
    file: { path: string; description: string },
    context: string,
    evidence: SourceEvidence,
  ) {
    const role = applicationRole(file.path);
    if (!this.workers.has(role)) this.workers.set(role, this.factory());
    const llm = this.workers.get(role)!;
    const source =
      validatedCurrentSource(file.path, evidence) ??
      (await generateSource(llm, file, context, roles[role], evidence));
    return reviewDesignSource(llm, file, source, context, roles[role], evidence);
  }
}
