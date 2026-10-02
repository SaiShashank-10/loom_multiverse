import { retryInference } from "../../llm/ollama-health.js";
import path from "node:path";
import fs from "node:fs/promises";
import ts from "typescript";
import postcss from "postcss";
import { parseDocument } from "yaml";
import { spawnSync } from "node:child_process";
import { createTier2LLM } from "../../llm/index.js";
import { safePath } from "./validation.js";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { styleInstructions, validateStyleBindings, type StyleContract } from "./style-contract.js";
const prose =
  /^(?:based on (?:the |your )?(?:provided|information|HTML)|it (?:looks|seems|appears)(?: like| that| you've| you have)|the (?:provided|following|given) (?:information|code|content|JSON|HTML|data)|here(?:'s| is| are)|to (?:train|implement|create|build) |you (?:can|should|would)|this (?:code|file|example) (?:will|provides|demonstrates)|below is|certainly|sure[,!])/i;

const languageSignals: Record<string, RegExp> = {
  ".dart":
    /^(?:import |export |part |library |class |enum |mixin |extension |typedef |(?:Future<[^>]+>|Future|Stream<[^>]+>|Widget|void|int|double|bool|String|final|const|var)\s+\w+)/m,
  ".java":
    /^(?:package |import |public |protected |private |abstract |final |sealed |class |interface |enum |record |@\w+)/m,
  ".kt":
    /^(?:package |import |class |data class |sealed class |interface |object |enum class |fun |val |var |@\w+)/m,
  ".kts":
    /^(?:plugins\s*\{|dependencies\s*\{|repositories\s*\{|tasks\.|android\s*\{|rootProject\.|include\()/m,
  ".go": /^(?:package\s+\w+|import\s*\(?|func\s+\w+|type\s+\w+|(?:var|const)\s+\w+)/m,
  ".rs": /^(?:(?:pub\s+)?(?:use|mod|fn|struct|enum|trait|impl|type|const|static)\b|#\[)/m,
  ".swift": /^(?:import |class |struct |enum |protocol |extension |actor |func |let |var |@\w+)/m,
  ".cs":
    /^(?:using |namespace |public |internal |private |protected |sealed |abstract |class |interface |record |enum |\[\w+)/m,
  ".c": /^(?:#\s*(?:include|define)|(?:static\s+)?(?:void|int|char|float|double|struct|enum|typedef)\b)/m,
  ".h": /^(?:#\s*(?:include|define|ifndef|pragma)|(?:class|struct|enum|typedef)\b)/m,
  ".cc": /^(?:#\s*(?:include|define)|(?:namespace|class|struct|template|void|int|auto)\b)/m,
  ".cpp": /^(?:#\s*(?:include|define)|(?:namespace|class|struct|template|void|int|auto)\b)/m,
  ".hpp": /^(?:#\s*(?:include|define|ifndef|pragma)|(?:namespace|class|struct|template)\b)/m,
  ".php": /^(?:<\?php|namespace |use |class |interface |trait |function |\$\w+\s*=)/m,
  ".rb": /^(?:require |require_relative |module |class |def |attr_|[A-Z]\w*\s*=)/m,
  ".scala": /^(?:package |import |object |class |case class |trait |enum |def |val |var |given )/m,
  ".lua": /^(?:local |function |require\s*\(|return\b|\w+\s*=)/m,
  ".r": /^(?:library\s*\(|require\s*\(|\w+\s*<-|\w+\s*=\s*function\s*\()/m,
  ".sql": /^(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|SELECT|WITH|BEGIN|GRANT|REVOKE)\b/im,
  ".sh": /^(?:#!.*\b(?:sh|bash|zsh)\b|set\s+-|(?:export|readonly|function)\s+\w+|\w+\s*\(\)\s*\{)/m,
  ".ps1":
    /^(?:#requires\b|param\s*\(|function\s+[\w-]+|\$[\w:]+\s*=|(?:Set|Get|New|Remove|Invoke|Start|Stop)-[A-Za-z]+)/im,
  ".tf": /^(?:terraform|provider|resource|data|module|variable|output|locals)\s+(?:"|\{)/m,
  ".graphql":
    /^(?:schema|type|interface|union|enum|input|scalar|directive|query|mutation|subscription|fragment)\b/m,
  ".proto": /^(?:syntax\s*=|package |import |option |message |enum |service |rpc )/m,
};

function mandatorySourceContract(file: string): string {
  const mlModule = file
    .replace(/\\/g, "/")
    .match(/(?:^|\/)ml\/(preprocess|train|finetune|evaluate|verify|predict)\.py$/i)?.[1]
    ?.toLowerCase();
  if (!mlModule) return "";
  const behavior: Record<string, string> = {
    preprocess:
      "validate the configured dataset, split before fitting transformations, persist fitted preprocessing and split identity under outputDir",
    train:
      "load the persisted training split, perform real fit/optimization, and save a reloadable checkpoint plus optimizer/resume state",
    finetune:
      "require and load pretrainedCheckpoint, validate compatibility, configure trainable layers, perform real fit/optimization, and save a distinct checkpoint",
    evaluate:
      "reload the trained checkpoint, predict on the held-out split, compute metrics and a baseline, save predictions, and write the exact metrics.json evidence contract",
    verify:
      "independently reload the checkpoint using load_checkpoint/load_weights/load_model, run model.predict again on held-out inputs, recompute metrics from real labels and predictions without constants or placeholders, load metrics.json for its splitFingerprint, calculate SHA-256 hashes from the exact checkpoint and predictions file bytes with hashlib.sha256, check prediction parity, and write verification.json with runId, checkpointSha256, predictionsSha256, datasetFingerprint, splitFingerprint, examples, reloadParityMaxAbsError, parametersChanged=true, heldOutOnly=true, metricsRecomputed=true",
    predict:
      "load persisted preprocessing and a trained checkpoint, run actual model prediction, and raise a clear not-trained error when artifacts are absent",
  };
  return `MANDATORY ${file} CONTRACT: implement def ${mlModule}(...) or def main(...); ${behavior[mlModule]}; import or define every referenced name; expose a runnable argparse CLI containing parser.add_argument("--config", required=True) followed by parser.parse_args(). The CLI must execute this module using the supplied config path.`;
}

function validatePythonNames(file: string, text: string): void {
  const script = [
    "import io, sys",
    "try:",
    " from pyflakes.api import check",
    " from pyflakes.reporter import Reporter",
    "except ModuleNotFoundError:",
    " sys.exit(0)",
    "out, err = io.StringIO(), io.StringIO()",
    "check(sys.stdin.read(), sys.argv[1], Reporter(out, err))",
    "messages = [line for line in (out.getvalue() + err.getvalue()).splitlines() if 'undefined name' in line or 'may be undefined' in line]",
    "print('\\n'.join(messages))",
    "sys.exit(2 if messages else 0)",
  ].join("\n");
  const checked = spawnSync("python", ["-c", script, file], {
    input: text,
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
  });
  if (checked.status === 2)
    throw new Error(`${file}: undefined Python names: ${checked.stdout.trim().slice(0, 1000)}`);
}

const knownPythonImports: Array<[RegExp, string, string]> = [
  [/\bargparse\b/, "argparse", "import argparse"],
  [/\bhashlib\b/, "hashlib", "import hashlib"],
  [/\bjson\b/, "json", "import json"],
  [/\bPath\b/, "Path", "from pathlib import Path"],
  [/\btf\b/, "tf", "import tensorflow as tf"],
  [/\btorch\b/, "torch", "import torch"],
  [/\bnp\b/, "np", "import numpy as np"],
  [/\bpd\b/, "pd", "import pandas as pd"],
  [
    /\btrain_test_split\b/,
    "train_test_split",
    "from sklearn.model_selection import train_test_split",
  ],
  [/\bInput\b/, "Input", "from tensorflow.keras.layers import Input"],
  [
    /\bCareerNavigationModel\b/,
    "CareerNavigationModel",
    "from ml.model import CareerNavigationModel",
  ],
  [/\bcustom_loss\b/, "custom_loss", "from ml.model import custom_loss"],
  [/\bload_config\b/, "load_config", "from ml.common import load_config"],
  [/\bload_checkpoint\b/, "load_checkpoint", "from ml.common import load_checkpoint"],
  [/\bget_artifact_path\b/, "get_artifact_path", "from ml.common import get_artifact_path"],
];

function hasPythonBinding(text: string, name: string): boolean {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(?:^|\\n)\\s*(?:(?:class|def)\\s+${escaped}\\b|(?:from|import)\\s+[^\\n]*\\b${escaped}\\b|${escaped}\\s*=)`,
    "m",
  ).test(text);
}

/** Repair only unambiguous standard aliases; semantic or project-specific names still fail validation. */
function repairKnownPythonImports(file: string, text: string): string {
  if (path.extname(file).toLowerCase() !== ".py") return text;
  const additions = knownPythonImports
    .filter(([usage, name]) => usage.test(text) && !hasPythonBinding(text, name))
    .map(([, , statement]) => statement)
    .filter((statement, index, all) => all.indexOf(statement) === index);
  if (!additions.length) return text;
  const futureImports = [...text.matchAll(/^from __future__ import .*$/gm)];
  if (!futureImports.length) return `${additions.join("\n")}\n${text}`;
  const last = futureImports.at(-1)!;
  const insertion = (last.index ?? 0) + last[0].length;
  return `${text.slice(0, insertion)}\n${additions.join("\n")}${text.slice(insertion)}`;
}

function validateKnownLanguage(file: string, text: string, ext: string): void {
  const signal = languageSignals[ext];
  if (signal && !signal.test(text))
    throw new Error(`${file}: no recognizable ${ext.slice(1)} implementation`);
  if (
    /\.(?:vue|svelte)$/.test(ext) &&
    !/<(?:script|template|style|svelte:|[A-Z][\w.-]*)\b/i.test(text)
  )
    throw new Error(`${file}: component markup or script missing`);
  if (/\.(?:xml|svg|plist)$/.test(ext) && !/^\s*<\??[A-Za-z!]/.test(text))
    throw new Error(`${file}: XML markup missing`);
  if (ext === ".toml" && !/^\s*(?:\[[^\]]+\]|[A-Za-z0-9_.-]+\s*=)/m.test(text))
    throw new Error(`${file}: TOML entries missing`);
  if (/^(?:Dockerfile|Containerfile)$/i.test(path.basename(file)) && !/^\s*FROM\s+\S+/im.test(text))
    throw new Error(`${file}: container base image missing`);
  if (
    /^(?:Makefile|GNUmakefile)$/i.test(path.basename(file)) &&
    !/^\s*[A-Za-z0-9_.-]+\s*:(?![=])/m.test(text)
  )
    throw new Error(`${file}: build targets missing`);
}

export function validateSource(file: string, content: string): void {
  const ext = path.extname(file).toLowerCase(),
    name = path.basename(file);
  if (!content.trim() && name !== "__init__.py") throw new Error(`${file}: empty output`);
  if (/\.(md|txt)$/i.test(file) && !/requirements.*\.txt$/i.test(name)) return;
  const text = content.trim();
  if (
    prose.test(text) ||
    /^```/.test(text) ||
    /\b(?:TODO(?::|\s).*implement|implementation goes here|your code here|add your (?:logic|code)|placeholder(?: for)? (?:actual |real )?(?:logic|implementation|metric|calculation)|not implemented|NotImplementedError|UnsupportedOperationException\("not implemented)\b/i.test(
      text,
    ) ||
    (!/^\.env\.(?:example|template)$/i.test(name) &&
      ![".ini", ".yaml", ".yml", ".toml", ".py", ".rb", ".sh", ".properties"].includes(ext) &&
      ![".gitignore", ".gitattributes", ".metadata"].includes(name) &&
      /^(?:#{1,6}\s+|\d+\.\s+\*{0,2}(?:create|implement|add|define|set up)\b)/i.test(text))
  )
    throw new Error(`${file}: explanation or placeholder returned instead of source`);
  validateKnownLanguage(file, text, ext);
  if (ext === ".dart" && /(?:^|\/)(?:test|integration_test)\/|_test\.dart$/i.test(file)) {
    const executable = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    if (!/\b(?:testWidgets|test)\s*\(/.test(executable) ||
        !/\b(?:expect|expectLater|expectSync|verify)\s*\(/.test(executable))
      throw new Error(`${file}: Dart tests require registered test/testWidgets cases and executable assertions, not comments or an empty binding`);
  }
  if (ext === ".json") {
    const value = JSON.parse(text);
    if (
      /\b(?:TODO|placeholder|add (?:real|actual)|fill (?:this|in)|implement (?:this|later)|replace me)\b/i.test(
        JSON.stringify(value),
      )
    )
      throw new Error(`${file}: placeholder values returned instead of configuration`);
    if (
      name === "package.json" &&
      (!value || Array.isArray(value) || typeof value !== "object" || !value.name)
    )
      throw new Error("package.json needs an object with a package name");
  }
  if (ext === ".css" || ext === ".scss") {
    const sheet = postcss.parse(text, { from: file });
    if (!sheet.nodes.some((node) => node.type !== "comment"))
      throw new Error(`${file}: no stylesheet rules or declarations`);
  }
  if (ext === ".yaml" || ext === ".yml") {
    const document = parseDocument(text, { uniqueKeys: true });
    if (document.errors.length) throw new Error(`${file}: ${document.errors[0]!.message}`);
    // Plain prose is itself legal YAML, but is not a generated application configuration.
    if (!document.contents || typeof document.toJSON() !== "object")
      throw new Error(`${file}: expected a YAML mapping or sequence, not a prose scalar`);
    if (name === "pubspec.yaml") {
      const pkg = document.toJSON();
      if (pkg.test_dependencies !== undefined)
        throw new Error(
          `${file}: test_dependencies is not a Dart pubspec field; put flutter_test and integration_test under dev_dependencies`,
        );
      if (pkg.dependencies?.flutter?.sdk === "flutter" && !pkg.environment?.sdk)
        throw new Error(
          `${file}: Flutter application requires environment.sdk compatible with the installed Dart SDK`,
        );
    }
  }
  if (/^\.env\.(example|template)$/i.test(name) || ext === ".ini") {
    const lines = text.split(/\r?\n/).filter((line) => line.trim() && !/^\s*[#;]/.test(line));
    const linePattern =
      ext === ".ini"
        ? /^\s*(?:\[[^\]]+\]|[\w.-]+\s*=.*|\s+\S.*)$/
        : /^\s*(?:export\s+)?[A-Za-z_]\w*\s*=.*$/;
    if (!lines.length || lines.some((line) => !linePattern.test(line)))
      throw new Error(`${file}: expected configuration entries, not prose`);
  }
  if (/\.(?:js|jsx|ts|tsx|mjs|cjs)$/.test(file)) {
    const source = ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      /\.tsx$/.test(file)
        ? ts.ScriptKind.TSX
        : /\.ts$/.test(file)
          ? ts.ScriptKind.TS
          : ts.ScriptKind.JSX,
    );
    const diagnostics = (source as ts.SourceFile & { parseDiagnostics: ts.Diagnostic[] })
      .parseDiagnostics;
    if (diagnostics.length)
      throw new Error(
        `${file}: ${ts.flattenDiagnosticMessageText(diagnostics[0]!.messageText, " ")}`,
      );
    if (!source.statements.length) throw new Error(`${file}: no executable statements`);
    if (
      source.statements.every(
        (statement) =>
          ts.isExpressionStatement(statement) &&
          (ts.isStringLiteral(statement.expression) || ts.isIdentifier(statement.expression)),
      )
    )
      throw new Error(`${file}: only a description or bare identifier, no implementation`);
    const options: ts.CompilerOptions = {
      allowJs: true,
      checkJs: true,
      noResolve: true,
      noLib: true,
      noEmit: true,
      target: ts.ScriptTarget.Latest,
    };
    const host = ts.createCompilerHost(options);
    host.getSourceFile = (name) => (name === file ? source : undefined);
    host.fileExists = (name) => name === file;
    host.readFile = (name) => (name === file ? text : undefined);
    const program = ts.createProgram([file], options, host);
    const constantAssignment = program.getSemanticDiagnostics(source).find((d) => d.code === 2588);
    if (constantAssignment)
      throw new Error(
        `${file}: ${ts.flattenDiagnosticMessageText(constantAssignment.messageText, " ")}`,
      );
  }
  if (ext === ".py") {
    const checked = spawnSync("python", ["-c", "import ast,sys; ast.parse(sys.stdin.read())"], {
      input: text,
      encoding: "utf8",
      timeout: 10000,
      windowsHide: true,
    });
    if (checked.error)
      throw new Error(`Python syntax validation unavailable: ${checked.error.message}`);
    if (checked.status !== 0) throw new Error(`${file}: ${checked.stderr.slice(-1000)}`);
    validatePythonNames(file, text);
  }
  if (
    ext === ".py" &&
    name !== "__init__.py" &&
    !/^(?:from |import |def |class |async def |[A-Za-z_]\w*\s*=|if __name__)/m.test(text)
  )
    throw new Error(`${file}: no Python implementation`);
  const mlModule = file
    .replace(/\\/g, "/")
    .match(/(?:^|\/)ml\/(preprocess|train|finetune|evaluate|verify|predict)\.py$/i)?.[1]
    ?.toLowerCase();
  if (mlModule) {
    if (!new RegExp(`def\\s+(?:${mlModule}|main|run)\\s*\\(`, "i").test(text))
      throw new Error(`${file}: missing ${mlModule} implementation entrypoint`);
    if (
      !/(?:add_argument|option)\s*\(\s*["']--config["']/i.test(text) ||
      !/(?:ArgumentParser|parse_args\s*\(|click\.|typer\.)/i.test(text)
    )
      throw new Error(`${file}: missing required --config command-line contract`);
    const behavior: Record<string, RegExp> = {
      preprocess:
        /(?:train_test_split|GroupShuffleSplit|TimeSeriesSplit|\.fit_transform\s*\(|\.transform\s*\(|split\s*\()/,
      train: /(?:\.fit\s*\(|\.backward\s*\(|GradientTape|optimizer\.step\s*\()/,
      finetune: /(?:\.fit\s*\(|\.backward\s*\(|GradientTape|optimizer\.step\s*\()/,
      evaluate: /(?:predict|inference|metric|accuracy|precision|recall|mean_squared|ndcg)/i,
      verify: /(?:sha256|hashlib)/i,
      predict:
        /(?:predict|forward|inference|load_checkpoint|load_weights|load_state|joblib\.load|keras\.models\.load_model)/i,
    };
    if (!behavior[mlModule]!.test(text))
      throw new Error(`${file}: no recognizable ${mlModule} behavior`);
    if (mlModule === "verify") {
      const missing = [
        [
          /(?:load_checkpoint|load_weights|load_state|joblib\.load|keras\.models\.load_model|predict_texts)/i,
          "checkpoint reload",
        ],
        [/verification\.json/i, "verification.json output"],
        [/metrics\.json/i, "metrics.json evidence input"],
        [/(?:metricsRecomputed|recomput(?:e|ed|ing).*metric)/i, "metric recomputation evidence"],
        [
          /(?:reloadParityMaxAbsError|prediction.*parity|parity.*prediction)/i,
          "reload parity evidence",
        ],
        [/(?:\.predict\s*\(|predict(?:_texts)?\s*\()/i, "independent model prediction"],
        [/(?:labels?|targets?|y_true|ground_truth)/i, "held-out labels"],
        [
          /(?:sha256_file\s*\(|read_bytes\s*\(|open\s*\([^\n]*(?:checkpoint|prediction)[^\n]*["']rb["'])/i,
          "artifact byte hashing",
        ],
      ].filter(([pattern]) => !(pattern as RegExp).test(text));
      if (missing.length)
        throw new Error(
          `${file}: incomplete verification behavior; missing ${missing.map(([, label]) => label).join(", ")}`,
        );
      if (
        /def\s+(?:compute|recompute)[^\n]*metric[\s\S]{0,800}?return\s*\{[^}]*:\s*(?:0(?:\.\d+)?|1(?:\.0+)?)\s*[,}]/i.test(
          text,
        )
      )
        throw new Error(`${file}: verification metrics are hard-coded instead of recomputed`);
    }
  }
  if (
    /requirements.*\.txt$/i.test(name) &&
    text
      .split(/\r?\n/)
      .some(
        (line) =>
          line.trim() &&
          !/^(?:#|-|[a-zA-Z0-9_.-]+(?:\[[^\]]+\])?(?:\s*[<>=!~@;].*)?$)/.test(line.trim()),
      )
  )
    throw new Error(`${file}: invalid dependency list`);
  if (ext === ".html" && !/<(?:!doctype|html|div|main|head|body)\b/i.test(text))
    throw new Error(`${file}: HTML markup missing`);
}
/** Fit relevant context while placing the actual file instruction last, outside any truncated history. */
export function sourceContext(context: string, file: string, description = ""): string {
  const terms = `${file} ${description}`
    .toLowerCase()
    .split(/[\/_.-]/)
    .filter((x) => x.length > 3);
  const paragraphs = context.split(/\n\s*\n/);
  const selected = paragraphs
    .map((text, index) => ({
      text,
      index,
      score: terms.filter((t) => text.toLowerCase().includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  let out = context.slice(0, 2500);
  for (const block of selected) {
    if (out.length >= 11000) break;
    out += "\n" + block.text.slice(0, 2500);
  }
  return out.slice(0, 11000);
}
export interface SourceEvidence {
  reviewModel?: BaseChatModel;
  reviewDependencies?: string;
  onSourceCheckpoint?: (source: string) => Promise<void>;
  onDesignRejection?: (source: string, issues: string[]) => Promise<void>;
  /** These small, concrete contracts are never passed through narrative relevance ranking. */
  structure?: string;
  interfaces?: string;
  constraints?: string;
  /** Approved visual evidence gets its own budget and survives every repair retry. */
  design?: string;
  styling?: StyleContract;
  /** A repair includes the complete file; never silently truncate it. */
  currentFile?: string;
}

/** Re-review current UI before replacing it. Invalid drafts still enter generation. */
export function validatedCurrentSource(file: string, evidence: SourceEvidence): string | undefined {
  if (!evidence.currentFile || !evidence.design) return undefined;
  try {
    validateSource(file, evidence.currentFile);
    validateFilePurpose(file, evidence.currentFile, evidence.structure);
    validateStyleBindings(file, evidence.currentFile, evidence.styling);
    return evidence.currentFile;
  } catch {
    return undefined;
  }
}
export async function generateSource(
  llm: BaseChatModel,
  file: { path: string; description: string },
  context: string,
  role = "Application code engineer",
  evidence: SourceEvidence = {},
) {
  if ((evidence.currentFile?.length ?? 0) > 24000)
    throw new Error(
      `${file.path}: file exceeds bounded whole-file repair context; split the module or repair it with a targeted edit`,
    );
  const jsonFile = file.path.endsWith(".json");
  const outputRule = jsonFile
    ? "Return the actual JSON document directly, NOT a content wrapper or a filename label."
    : "Return JSON with exactly one content string containing the COMPLETE raw file.";
  const schema = jsonFile
    ? path.basename(file.path) === "package.json"
      ? {
          type: "object",
          required: ["name", "scripts"],
          properties: {
            name: { type: "string" },
            version: { type: "string" },
            scripts: {
              type: "object",
              required: /(?:test|spec)\.|(?:tests?|__tests__)\//i.test(evidence.structure ?? "")
                ? ["test"]
                : [],
              additionalProperties: { type: "string" },
            },
            dependencies: { type: "object", additionalProperties: { type: "string" } },
            devDependencies: { type: "object", additionalProperties: { type: "string" } },
          },
        }
      : { type: "object" }
    : {
        type: "object",
        additionalProperties: false,
        required: ["content"],
        properties: { content: { type: "string" } },
      };
  const mandatoryContract = mandatorySourceContract(file.path);
  let feedback = "";
  let cpuRetried = false;
  const repairModel =
    (process.env.LLM_PROVIDER ?? "ollama") === "ollama"
      ? process.env.OLLAMA_REPAIR_MODEL?.trim()
      : undefined;
  const maxAttempts = repairModel ? 4 : 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt === 4 && repairModel) {
      llm = createTier2LLM({
        model: repairModel,
        maxTokens: 8192,
        contextWindow: evidence.design ? 16384 : 8192,
        gpuLayers: 0,
        temperature: 0.05,
      });
      feedback = `The normal code model exhausted three repairs. Perform one final precise repair with the stronger model. ${feedback}`;
    }
    let response;
    let rejectedContent = "";
    try {
      const initialPrompt = `Relevant project context:\n${sourceContext(context, file.path, file.description).slice(0, evidence.structure || evidence.interfaces ? 5000 : 11000)}\n\nProject file paths (do not invent alternate layouts):\n${evidence.structure?.slice(0, 2500) ?? "See context"}\n\nExisting source interfaces (match these exact exports, imports and data shapes):\n${evidence.interfaces?.slice(0, 5500) ?? "No existing interfaces supplied"}\n\n${evidence.currentFile !== undefined ? `Complete current file to repair (preserve unrelated behavior):\n${evidence.currentFile}\n` : ""}\nFINAL TASK: Implement ${file.path}. Purpose: ${file.description}. ${outputRule} ${mandatoryContract}`;
      const repairPrompt = `TARGETED COMPLETE-FILE REPAIR for ${file.path}. Keep the valid behavior in the rejected draft and fix the stated validation error. Do not redesign the project.\nRelevant existing interfaces:\n${evidence.interfaces?.slice(0, 3500) ?? "No existing interfaces supplied"}\n\n${outputRule} ${mandatoryContract}\n${feedback}`;
      response = await retryInference(() =>
        llm.invoke(
          [
            new SystemMessage(
              `${role}. Implement the requested file, not an explanation of the supplied context. ${outputRule} Real executable code for source files, valid JSON for JSON files, documentation only for documentation files. No markdown fences or placeholder implementations.\nAuthoritative constraints (override reference-document alternatives): ${evidence.constraints?.slice(0, 2500) ?? "Preserve the approved project stack."}\n${styleInstructions(evidence.styling).slice(0, 800)}`,
            ),
            new HumanMessage(
              `${feedback ? repairPrompt : initialPrompt}${evidence.design ? `\n\nAPPROVED STITCH VISUAL CONTRACT (preserve during implementation and repair):\n${evidence.design}` : ""}\n${styleInstructions(evidence.styling)}\n\nFINAL TASK: Implement ${file.path}. Purpose: ${file.description}. ${outputRule} ${mandatoryContract}${feedback ? "\nCorrect the stated rejection; returning the unchanged rejected draft will fail validation." : ""}`,
            ),
          ],
          {
            signal: AbortSignal.timeout(900_000),
            format: schema,
          } as any,
        ),
      );
    } catch (error) {
      if (
        !cpuRetried &&
        /CUDA|GPU.*(?:memory|initialization)|llama runner.*terminated/i.test(String(error))
      ) {
        cpuRetried = true;
        llm = createTier2LLM({
          maxTokens: 8192,
          contextWindow: evidence.currentFile !== undefined || evidence.design ? 16384 : 8192,
          gpuLayers: 0,
          temperature: 0.1,
        });
        continue;
      }
      throw error;
    }
    try {
      const parsed = JSON.parse(String(response.content));
      let content = jsonFile ? JSON.stringify(parsed, null, 2) : parsed.content;
      if (path.basename(file.path) === "package.json") content = repairDeclaredTestScript(content);
      if (typeof content !== "string") throw new Error("Missing content string");
      if (!jsonFile) {
        const fenced = content.match(/^\s*(?:[^\n]*\n)?```[^\n]*\n([\s\S]*?)\n```\s*$/);
        if (fenced) content = fenced[1]!;
        content = repairKnownPythonImports(file.path, content);
      }
      rejectedContent = content;
      validateSource(file.path, content);
      validateFilePurpose(file.path, content, evidence.structure);
      validateStyleBindings(file.path, content, evidence.styling);
      return content.trimEnd() + "\n";
    } catch (error) {
      const rejectedDraft = rejectedContent
        ? `\nREJECTED DRAFT SOURCE (repair this complete file):\n--- BEGIN REJECTED DRAFT ---\n${rejectedContent.slice(0, 12000)}\n--- END REJECTED DRAFT ---`
        : "";
      feedback = `Previous attempt was rejected: ${String(error).slice(0, 500)}. Correct the complete file; do not describe how to implement it. ${mandatoryContract}${rejectedDraft}`;
      if (attempt === maxAttempts)
        throw new Error(
          `${file.path}: rejected ${maxAttempts} invalid generations. ${String(error)}`,
        );
    }
  }
  throw new Error("No source generated");
}

/** Syntax alone must not make an unusable application package reusable. */
export function repairDeclaredTestScript(content: string): string {
  const pkg = JSON.parse(content);
  const test = pkg.scripts?.test;
  if (
    typeof test === "string" &&
    test.trim() &&
    !/no test specified|^\s*(?:echo\b|true\s*$|exit\s+0)/i.test(test)
  )
    return content;
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  // Only use an explicitly declared runner. Never invent a test tool/version or a passing stub.
  const runners = ["vitest", "jest", "react-scripts"].filter((name) => dependencies[name]);
  if (runners.length !== 1) return content;
  pkg.scripts = {
    ...pkg.scripts,
    test:
      runners[0] === "vitest"
        ? "vitest run"
        : runners[0] === "jest"
          ? "jest --runInBand"
          : "react-scripts test --watchAll=false",
  };
  return JSON.stringify(pkg, null, 2);
}

export function validateFilePurpose(file: string, content: string, structure = "") {
  const basename = path.basename(file);
  if (
    /^App\.[jt]sx?$/i.test(basename) &&
    /return\s+(?:null|undefined)\s*;/.test(content) &&
    !/<[A-Za-z]/.test(content)
  )
    throw new Error(`${file}: application root renders no user interface`);
  if (basename !== "package.json" || !structure) return;
  const pkg = JSON.parse(content);
  if (
    /(?:^|\n).*(?:^|\/)(?:tests?|__tests__)\/|(?:test|spec)\.[^\n/]+/im.test(structure) &&
    (!pkg.scripts?.test || /no test specified|echo\s/i.test(pkg.scripts.test))
  )
    throw new Error(`${file}: generated behavioral tests are not connected to a real test script`);
  if (
    !pkg.scripts ||
    !Object.values(pkg.scripts).some(
      (script) =>
        typeof script === "string" &&
        script.trim() &&
        !/^(?:echo\b|true$|exit\s+0)/.test(script.trim()),
    )
  )
    throw new Error(
      `${file}: application package has no runnable scripts; include its actual build/test/start commands`,
    );
}
/** Only replace invalid existing content after a validated replacement is available. */
export async function saveGeneratedSource(
  root: string,
  file: string,
  content: string,
  existing: string,
) {
  validateSource(file, content);
  const target = safePath(root, file);
  if (existing) {
    const backup = path.join(root, ".loom-backups", `${Date.now()}`, file);
    await fs.mkdir(path.dirname(backup), { recursive: true });
    await fs.writeFile(backup, existing);
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(`${target}.loom-tmp`, content);
  await fs.rename(`${target}.loom-tmp`, target);
}
