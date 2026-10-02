import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { extractAndParseJson } from "../../llm/json-parser.js";
import { retryInference } from "../../llm/ollama-health.js";

export const MLPlanSchema = z
  .object({
    requiresTraining: z.boolean(),
    task: z.enum([
      "classification",
      "regression",
      "ranking",
      "recommendation",
      "forecasting",
      "generation",
      "detection",
      "segmentation",
      "clustering",
      "anomaly_detection",
      "reinforcement_learning",
      "representation_learning",
      "other",
      "none",
    ]),
    modalities: z.array(
      z.enum([
        "tabular",
        "image",
        "text",
        "sequence",
        "graph",
        "audio",
        "video",
        "multimodal",
        "other",
      ]),
    ),
    framework: z.enum(["pytorch", "tensorflow", "scikit-learn", "xgboost", "other", "none"]),
    modelFamily: z.enum([
      "cnn",
      "rnn",
      "lstm",
      "gnn",
      "transformer",
      "diffusion",
      "tree",
      "linear",
      "ensemble",
      "custom",
      "none",
    ]),
    mode: z.enum(["new", "resume", "finetune", "none"]),
    datasetSchema: z.string(),
    splitStrategy: z.string(),
    metrics: z.array(z.string()).max(12),
    acceptanceCriteria: z.array(z.string()).max(12),
    compute: z.object({
      device: z.enum(["cpu", "cuda", "auto"]),
      maxRuntimeMinutes: z.number().int().min(1).max(1440),
      maxMemoryGB: z.number().positive().max(256),
    }),
    rationale: z.string(),
  })
  .superRefine((plan, context) => {
    if (
      plan.requiresTraining &&
      (plan.task === "none" ||
        plan.framework === "none" ||
        plan.modelFamily === "none" ||
        plan.mode === "none")
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Training plans need task, framework, modelFamily and mode",
      });
    if (
      !plan.requiresTraining &&
      (plan.task !== "none" ||
        plan.framework !== "none" ||
        plan.modelFamily !== "none" ||
        plan.mode !== "none")
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Non-training plans must use none values",
      });
  });
export type MLPlan = z.infer<typeof MLPlanSchema>;

const taskValues = [
  "classification",
  "regression",
  "ranking",
  "recommendation",
  "forecasting",
  "generation",
  "detection",
  "segmentation",
  "clustering",
  "anomaly_detection",
  "reinforcement_learning",
  "representation_learning",
  "other",
  "none",
] as const;
const modalityValues = [
  "tabular",
  "image",
  "text",
  "sequence",
  "graph",
  "audio",
  "video",
  "multimodal",
  "other",
] as const;
const frameworkValues = ["pytorch", "tensorflow", "scikit-learn", "xgboost", "other", "none"] as const;
const modelFamilyValues = [
  "cnn",
  "rnn",
  "lstm",
  "gnn",
  "transformer",
  "diffusion",
  "tree",
  "linear",
  "ensemble",
  "custom",
  "none",
] as const;
const modeValues = ["new", "resume", "finetune", "none"] as const;

const mlPlanJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "requiresTraining",
    "task",
    "modalities",
    "framework",
    "modelFamily",
    "mode",
    "datasetSchema",
    "splitStrategy",
    "metrics",
    "acceptanceCriteria",
    "compute",
    "rationale",
  ],
  properties: {
    requiresTraining: { type: "boolean" },
    task: { type: "string", enum: taskValues },
    modalities: { type: "array", items: { type: "string", enum: modalityValues } },
    framework: { type: "string", enum: frameworkValues },
    modelFamily: { type: "string", enum: modelFamilyValues },
    mode: { type: "string", enum: modeValues },
    datasetSchema: { type: "string" },
    splitStrategy: { type: "string" },
    metrics: { type: "array", maxItems: 12, items: { type: "string" } },
    acceptanceCriteria: { type: "array", maxItems: 12, items: { type: "string" } },
    compute: {
      type: "object",
      additionalProperties: false,
      required: ["device", "maxRuntimeMinutes", "maxMemoryGB"],
      properties: {
        device: { type: "string", enum: ["cpu", "cuda", "auto"] },
        maxRuntimeMinutes: { type: "integer", minimum: 1, maximum: 1440 },
        maxMemoryGB: { type: "number", exclusiveMinimum: 0, maximum: 256 },
      },
    },
    rationale: { type: "string" },
  },
} as const;

function key(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[\s/]+/g, "_").replace(/-/g, "_")
    : "";
}

function describe(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function descriptions(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return values.map((item) => describe(item, "")).filter(Boolean).slice(0, 12);
}

function numberWithin(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function task(value: unknown): MLPlan["task"] {
  const normalized = key(value);
  if ((taskValues as readonly string[]).includes(normalized)) return normalized as MLPlan["task"];
  if (/job_?match|role_?compat|semantic_?similar|candidate_?match|retriev/.test(normalized))
    return "ranking";
  if (/recommend|collaborative_?filter|content_?based/.test(normalized)) return "recommendation";
  if (/classif|probability|screening|pass_?fail|sentiment/.test(normalized)) return "classification";
  if (/forecast|time_?series/.test(normalized)) return "forecasting";
  if (/anomal|outlier|fraud/.test(normalized)) return "anomaly_detection";
  if (/cluster/.test(normalized)) return "clustering";
  if (/generat|seq2seq|sequence_?to_?sequence|translation|summari/.test(normalized)) return "generation";
  if (/regress|score_?predict/.test(normalized)) return "regression";
  return "other";
}

function framework(value: unknown): MLPlan["framework"] {
  const normalized = key(value);
  if ((frameworkValues as readonly string[]).includes(normalized))
    return normalized as MLPlan["framework"];
  if (/torch/.test(normalized)) return "pytorch";
  if (/tensorflow|keras/.test(normalized)) return "tensorflow";
  if (/scikit|sklearn/.test(normalized)) return "scikit-learn";
  if (/xgboost|lightgbm|catboost/.test(normalized)) return "xgboost";
  return "other";
}

function modelFamily(value: unknown): MLPlan["modelFamily"] {
  const normalized = key(value);
  if ((modelFamilyValues as readonly string[]).includes(normalized))
    return normalized as MLPlan["modelFamily"];
  if (/sequence_?to_?sequence|seq2seq|encoder_?decoder|bert|gpt|attention/.test(normalized))
    return "transformer";
  if (/gradient_?boost|decision_?tree|xgboost|lightgbm|catboost/.test(normalized)) return "tree";
  if (/random_?forest|stack|vot/.test(normalized)) return "ensemble";
  if (/logistic|linear|svm/.test(normalized)) return "linear";
  if (/convolution/.test(normalized)) return "cnn";
  if (/recurrent/.test(normalized)) return "rnn";
  return "custom";
}

function modalities(value: unknown): MLPlan["modalities"] {
  const values = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  const result = values.map((item): MLPlan["modalities"][number] => {
    const normalized = key(item);
    if ((modalityValues as readonly string[]).includes(normalized))
      return normalized as MLPlan["modalities"][number];
    if (/nlp|language|resume|document|job_?description/.test(normalized)) return "text";
    if (/tabul|table|structured|feature|metadata/.test(normalized)) return "tabular";
    if (/time_?series|temporal/.test(normalized)) return "sequence";
    if (/picture|vision|photo/.test(normalized)) return "image";
    if (/mixed|multi/.test(normalized)) return "multimodal";
    return "other";
  });
  return [...new Set(result)];
}

/** Convert common local-model aliases and nested descriptions into the canonical persisted schema. */
function normalizeMLPlan(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  const requiresTraining =
    input.requiresTraining === true || key(input.requiresTraining) === "true" || input.requiresTraining === 1;
  const compute =
    input.compute && typeof input.compute === "object" && !Array.isArray(input.compute)
      ? (input.compute as Record<string, unknown>)
      : {};
  if (!requiresTraining) {
    return {
      ...nonTrainingPlan,
      datasetSchema: describe(input.datasetSchema, nonTrainingPlan.datasetSchema),
      splitStrategy: describe(input.splitStrategy, nonTrainingPlan.splitStrategy),
      rationale: describe(input.rationale, nonTrainingPlan.rationale),
      compute: {
        device: "auto",
        maxRuntimeMinutes: Math.round(numberWithin(compute.maxRuntimeMinutes, 120, 1, 1440)),
        maxMemoryGB: numberWithin(compute.maxMemoryGB, 8, 0.1, 256),
      },
    };
  }
  const rawMode = key(input.mode);
  const normalizedMode: MLPlan["mode"] = (modeValues as readonly string[]).includes(rawMode)
    ? rawMode === "none"
      ? "none"
      : (rawMode as MLPlan["mode"])
    : /fine_?tun|adapt|lora|qlora/.test(rawMode)
      ? "finetune"
      : /resum|continu|checkpoint/.test(rawMode)
        ? "resume"
        : "new"; // "inference" cannot satisfy a request that explicitly requires model fitting.
  const deviceKey = key(compute.device);
  const device: MLPlan["compute"]["device"] = /cuda|gpu/.test(deviceKey)
    ? "cuda"
    : deviceKey === "cpu"
      ? "cpu"
      : "auto";
  return {
    requiresTraining: true,
    task: task(input.task),
    modalities: modalities(input.modalities),
    framework: framework(input.framework),
    modelFamily: modelFamily(input.modelFamily),
    mode: normalizedMode,
    datasetSchema: describe(input.datasetSchema, "Dataset schema must be supplied before training."),
    splitStrategy: describe(input.splitStrategy, "Deterministic train/validation/test split."),
    metrics: descriptions(input.metrics),
    acceptanceCriteria: descriptions(input.acceptanceCriteria),
    compute: {
      device,
      maxRuntimeMinutes: Math.round(numberWithin(compute.maxRuntimeMinutes, 120, 1, 1440)),
      maxMemoryGB: numberWithin(compute.maxMemoryGB, 8, 0.1, 256),
    },
    rationale: describe(input.rationale, "The approved requirements explicitly require model training."),
  };
}

const nonTrainingPlan: MLPlan = {
  requiresTraining: false,
  task: "none",
  modalities: [],
  framework: "none",
  modelFamily: "none",
  mode: "none",
  datasetSchema: "No training dataset required.",
  splitStrategy: "Not applicable.",
  metrics: [],
  acceptanceCriteria: [],
  compute: { device: "auto", maxRuntimeMinutes: 120, maxMemoryGB: 8 },
  rationale: "The approved project does not require fitting or fine-tuning a model.",
};

export async function resolveMLPlan(
  root: string,
  llm: BaseChatModel,
  approvedContext: string,
  notify: (message: string) => void = () => {},
): Promise<MLPlan> {
  const target = path.join(root, "ml-plan.json");
  const fingerprint = createHash("sha256").update(`ml-plan-v3\n${approvedContext}`).digest("hex");
  try {
    const saved = JSON.parse(await fs.readFile(target, "utf8"));
    if (saved.fingerprint === fingerprint) return MLPlanSchema.parse(saved.plan);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      notify("Saved ML plan is invalid and will be regenerated.");
  }

  let feedback = "";
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await retryInference(() =>
      llm.invoke(
        [
          new SystemMessage(
            "Decide whether the approved client project requires REAL local model fitting, training, resuming, or fine-tuning. Portfolio text, AI API integration, chatbot use, TensorFlow.js inference, rejected alternatives, and merely discussing ML are not training projects. If training is required, produce one concrete scientific plan matching the explicitly approved model family and data. Never invent an available dataset, pretrained checkpoint, benchmark result, or GPU capability. The local default machine budget is 4 GB VRAM and 16 GB RAM, so prefer bounded settings while preserving the requested architecture. Return JSON only.",
          ),
          new HumanMessage(
            `Approved requirements and planning documents:\n${approvedContext.slice(0, 30000)}\n\nReturn all fields: requiresTraining, task, modalities, framework, modelFamily, mode, datasetSchema, splitStrategy, metrics, acceptanceCriteria, compute {device,maxRuntimeMinutes,maxMemoryGB}, rationale. Follow the supplied JSON schema and use only its exact enum values. datasetSchema, splitStrategy, every metric, and every acceptanceCriteria item must be a string, never an object. "job matching" is task "ranking"; sequence-to-sequence/encoder-decoder is modelFamily "transformer"; use mode "new" when training a new model. For requiresTraining=false use task/framework/modelFamily/mode = "none" and empty metric/criteria arrays. ${feedback}`,
          ),
        ],
        { signal: AbortSignal.timeout(900_000), format: mlPlanJsonSchema } as any,
      ),
    );
    try {
      const parsed = extractAndParseJson(String(response.content));
      const plan = MLPlanSchema.parse(normalizeMLPlan(parsed));
      await fs.writeFile(`${target}.tmp`, JSON.stringify({ fingerprint, plan }, null, 2));
      await fs.rename(`${target}.tmp`, target);
      return plan;
    } catch (error) {
      feedback = `Previous JSON was invalid: ${String(error).slice(0, 800)}. Correct it without adding commentary.`;
      if (attempt === 3) throw new Error(`Unable to produce a valid ML plan: ${String(error)}`);
    }
  }
  return nonTrainingPlan;
}
