import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { generateSource, type SourceEvidence } from "./source-output.js";
import { createTier2LLM } from "../../llm/index.js";

export function needsML(context: string): boolean {
  return /\b(deep learning|neural|fine[- ]?tun(?:e|ing)|model training|train(?:ing)? (?:a |the )?model|pytorch|tensorflow(?!\.js)|scikit[- ]learn|xgboost|CNN|RNN|LSTM|GNN|transformer|collaborative filtering)\b/i.test(
    context,
  );
}
export const mlContract = `ML worker interface contract:
Use the approved ML framework and architecture, never silently substitute a linear model for a requested GNN/CNN/RNN/transformer.
All pipeline modules accept --config <absolute JSON path>. Config keys: dataset (local file/directory path), datasetFingerprint, seed, epochs, batchSize, device (cpu/cuda/auto), mode (new/resume/finetune), pretrainedCheckpoint, resumeCheckpoint, outputDir, runId, maxRuntimeMinutes.
Pipeline order: python -m ml.preprocess, then ml.train OR ml.finetune according to mode, then ml.evaluate and ml.verify. Config resolves relative dataset paths against the project root. Persist intermediate data and fitted preprocessing under the run-specific outputDir, never modify source datasets.
Preprocess splits BEFORE fitting transformations; task-specific temporal/group splits, train-only vocabularies/encoders, schema validation and data provenance. Never train or tune on the held-out test partition.
Train runs real optimization or estimator.fit, proves parameters changed from initialization, checkpoints model, optimizer/scheduler, random states, split identity and epoch for resuming. Resume mode restores resumeCheckpoint and validates model/config compatibility. Never use synthetic data except explicitly labeled smoke tests.
Finetune loads only the user's configured pretrainedCheckpoint, validates compatibility, configures trainable layers and optimizer, and persists a distinct checkpoint. Hyperparameter search uses validation data, never test data.
Evaluate loads the saved trained artifact, runs actual held-out predictions, a meaningful baseline, and writes predictions plus outputDir/metrics.json with {runId, dataset, examples, metrics, checkpoint, predictions, datasetFingerprint, splitFingerprint}. ml.verify independently reloads the artifact, checks prediction parity and recomputes metrics, then writes verification.json with SHA-256 hashes, parametersChanged, heldOutOnly and metricsRecomputed evidence. Metrics MUST be computed; never fabricate values or declare the PRD targets achieved without measurement. Include target attainment and uncertainty honestly.
Provide ml.predict for the backend to load saved preprocessing/model and predict; return a clear not-trained error before artifacts exist. APIs/UI must never synthesize training progress, recommendations or final results.
Respect available device and memory, reproducible seeds, finite epochs, interrupt-safe atomic checkpoints. For group recommendation use membership and interaction schemas, influence masking, ranking metrics (Recall/NDCG at k) and baseline comparisons as appropriate.
Missing data, unavailable weights or hardware are actionable prerequisites, not errors to fix by fabricating data or weakening validation.
`;
const roles = {
  data: "Data engineering worker: own ingestion, schema validation, leakage-safe splits, preprocessing and persisted fitted transforms.",
  model:
    "Model architecture worker: implement the exact approved architecture, losses, tensor shapes and invariants. Cover graph membership/influence masks for GNN projects, sequence masking for RNNs, and appropriate CNN/transformer input contracts when requested.",
  training:
    "Training worker: real optimization, validation-based early stopping, resumable checkpoints, CPU/GPU handling and bounded resources.",
  finetuning:
    "Fine-tuning worker: pretrained artifact compatibility, layer freezing/unfreezing, appropriate learning rates, optional validation-only hyperparameter search. No invented pretrained weights.",
  evaluation:
    "Evaluation worker: held-out prediction metrics, baselines and ablations, real model reload/inference, reproducibility and tests proving weight updates and serialization parity.",
  integration:
    "ML integration worker: shared config, entry points, dependency compatibility, real inference API integration, actionable prerequisite errors and truthful training status.",
} as const;
export type MLRole = keyof typeof roles;
export const mlFiles: Array<{ path: string; description: string; role: MLRole }> = [
  {
    path: "ml/__init__.py",
    description: "Package marker; no training side effects on import",
    role: "integration",
  },
  {
    path: "ml/requirements.txt",
    description: "Compatible versions of approved ML dependencies and pytest",
    role: "integration",
  },
  {
    path: "ml/pytest.ini",
    description:
      "pytest configuration with pythonpath=.. so tests run from ml directory and import ml package",
    role: "integration",
  },
  {
    path: "ml/common.py",
    description:
      "Shared config loader, seeded execution, artifact paths, checkpoint helpers; exported APIs documented for all workers",
    role: "integration",
  },
  {
    path: "ml/preprocess.py",
    description: "Complete preprocessing module and command-line entrypoint",
    role: "data",
  },
  {
    path: "ml/model.py",
    description: "Actual project-specific model architecture and loss definitions",
    role: "model",
  },
  {
    path: "ml/train.py",
    description: "Real resumable training module and command-line entrypoint",
    role: "training",
  },
  {
    path: "ml/finetune.py",
    description: "Real optional fine-tuning module and command-line entrypoint",
    role: "finetuning",
  },
  {
    path: "ml/predict.py",
    description: "Shared trained-model inference used by evaluation and the application backend",
    role: "evaluation",
  },
  {
    path: "ml/evaluate.py",
    description: "Measured evaluation, baseline comparison and metrics.json entrypoint",
    role: "evaluation",
  },
  {
    path: "ml/verify.py",
    description:
      "Independent checkpoint reload, held-out prediction parity, metric recomputation and hashed verification.json evidence",
    role: "evaluation",
  },
  {
    path: "ml/tests/test_pipeline.py",
    description:
      "Small explicitly synthetic smoke tests for leakage, finite loss, actual parameter updates, reload prediction parity and missing dataset errors; no production claims",
    role: "evaluation",
  },
  {
    path: "ml/README.md",
    description:
      "Dataset schema, real commands, compute prerequisites, checkpoint resume and measured-result interpretation",
    role: "integration",
  },
];
/** Independent specialist contexts with shared contracts and previously generated interfaces. */
export class MLCodeWorker {
  private llm?: BaseChatModel;
  constructor(
    readonly role: MLRole,
    private factory = () =>
      createTier2LLM({ maxTokens: 8192, contextWindow: 8192, temperature: 0.1 }),
  ) {}
  async generate(
    file: { path: string; description: string },
    context: string,
    evidence: SourceEvidence = {},
  ): Promise<string> {
    this.llm ??= this.factory();
    return generateSource(this.llm, file, `${mlContract}\n${context}`, roles[this.role], evidence);
  }
}
export class MLWorkerTeam {
  private workers = new Map<MLRole, MLCodeWorker>();
  constructor(
    private factory = () =>
      createTier2LLM({ maxTokens: 8192, contextWindow: 8192, temperature: 0.1 }),
  ) {}
  roleFor(file: string): MLRole {
    const exact = mlFiles.find((f) => f.path === file)?.role;
    if (exact) return exact;
    const normalized = file.toLowerCase();
    if (/preprocess|dataset|data[_-]?schema|augment|tokeni[sz]/.test(normalized)) return "data";
    if (/finetun|transfer|adapter|lora/.test(normalized)) return "finetuning";
    if (/train|optim|scheduler|loss/.test(normalized)) return "training";
    if (/model|network|architect|layer/.test(normalized)) return "model";
    if (/evaluat|metric|predict|infer|verif/.test(normalized)) return "evaluation";
    return "integration";
  }
  async generate(
    file: { path: string; description: string },
    context: string,
    evidence: SourceEvidence = {},
  ) {
    const role = this.roleFor(file.path);
    if (!this.workers.has(role)) this.workers.set(role, new MLCodeWorker(role, this.factory));
    return this.workers.get(role)!.generate(file, context, evidence);
  }
}
