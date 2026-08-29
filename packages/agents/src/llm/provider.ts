/**
 * @loom/agents — LLM Provider Factory
 *
 * Provider-agnostic LLM abstraction that routes to:
 * - Ollama (free, local — default)
 * - Anthropic Claude (paid fallback)
 * - OpenAI GPT (paid fallback)
 *
 * Uses LangChain's BaseChatModel interface so all agents work
 * identically regardless of the underlying provider.
 *
 * 3-Tier Model Strategy:
 * - Tier 1: qwen3:4b — fast tasks (classification, extraction, simple Q&A)
 * - Tier 2: qwen3:8b — complex reasoning (architecture, code generation)
 * - Tier 3: Cloud API — highest intelligence (if API key is present)
 */

import { ChatOllama } from "@langchain/ollama";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { createLogger } from "@loom/shared/logger";
import { config } from "@loom/shared/config";
import { AgentError } from "@loom/shared/errors";

const log = createLogger("llm-provider");

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** Supported LLM provider identifiers */
export type LLMProvider = "ollama" | "anthropic" | "openai";

/** Options for creating an LLM instance */
export interface LLMOptions {
  /** Which provider to use. Defaults to config.LLM_PROVIDER */
  provider?: LLMProvider;
  /** Model name/identifier. Defaults to provider's default model */
  model?: string;
  /** Sampling temperature (0.0 = deterministic, 1.0 = creative). Default: 0.3 */
  temperature?: number;
  /** Maximum tokens to generate. Default: 4096 */
  maxTokens?: number;
  /** Force specific format (e.g., 'json') */
  format?: "json" | "json_object" | undefined;
}

// ─────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────

/**
 * Creates an LLM instance based on the specified provider.
 *
 * This is the primary way agents get their LLM. The returned object
 * implements LangChain's BaseChatModel, so it works with:
 * - `llm.invoke([messages])`
 * - `llm.withStructuredOutput(zodSchema)`
 * - LangGraph node functions
 *
 * @param options - Provider, model, temperature, maxTokens
 * @returns A LangChain chat model instance
 *
 * @example
 * ```typescript
 * // Default: uses Ollama with qwen3:4b
 * const llm = createLLM();
 *
 * // Explicit options
 * const llm = createLLM({ provider: "ollama", model: "qwen3:8b", temperature: 0.1 });
 *
 * // With structured output
 * const structured = createLLM().withStructuredOutput(MyZodSchema);
 * const result = await structured.invoke("Analyze this idea...");
 * ```
 */
export function createLLM(options: LLMOptions = {}): BaseChatModel {
  const provider = options.provider ?? (config.LLM_PROVIDER as LLMProvider);
  const temperature = options.temperature ?? 0.3;
  const maxTokens = options.maxTokens ?? 4096;

  log.debug({ provider, model: options.model, temperature }, "Creating LLM instance");

  switch (provider) {
    case "ollama": {
      const model = options.model ?? config.OLLAMA_MODEL;
      log.info({ provider, model }, "Using Ollama (local, free)");

      return new ChatOllama({
        baseUrl: config.OLLAMA_BASE_URL,
        model,
        temperature,
        numPredict: maxTokens,
        // Disable thinking/reasoning mode for cleaner output if not explicitly requested
        format: options.format,
      });
    }

    case "anthropic": {
      const apiKey = config.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new AgentError(
          "ANTHROPIC_API_KEY is required when LLM_PROVIDER is 'anthropic'",
          "llm-provider",
          undefined,
          { provider },
        );
      }

      const model = options.model ?? "claude-sonnet-4-20250514";
      log.info({ provider, model }, "Using Anthropic Claude (paid)");

      return new ChatAnthropic({
        anthropicApiKey: apiKey,
        modelName: model,
        temperature,
        maxTokens,
      });
    }

    case "openai": {
      const apiKey = config.OPENAI_API_KEY;
      if (!apiKey) {
        throw new AgentError(
          "OPENAI_API_KEY is required when LLM_PROVIDER is 'openai'",
          "llm-provider",
          undefined,
          { provider },
        );
      }

      const model = options.model ?? "gpt-4o-mini";
      log.info({ provider, model }, "Using OpenAI (paid)");

      return new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: model,
        temperature,
        maxTokens,
      });
    }

    default: {
      const exhaustive: never = provider;
      throw new AgentError(
        `Unknown LLM provider: ${exhaustive}`,
        "llm-provider",
      );
    }
  }
}

// ─────────────────────────────────────────────
// Tier Helpers
// ─────────────────────────────────────────────

/**
 * Tier 1 LLM — fast, lightweight model for simple tasks.
 * Uses: classification, extraction, summarization, simple Q&A.
 * Default: Ollama qwen3:4b
 */
export function createTier1LLM(overrides: Partial<LLMOptions> = {}): BaseChatModel {
  return createLLM({
    provider: "ollama",
    model: config.OLLAMA_MODEL, // qwen3:4b
    temperature: 0.2,
    maxTokens: 8192,
    ...overrides,
  });
}

/**
 * Tier 2 LLM — more capable model for complex reasoning.
 * Uses: architecture design, code generation, multi-step planning.
 * Default: Ollama qwen3:8b
 */
export function createTier2LLM(overrides: Partial<LLMOptions> = {}): BaseChatModel {
  return createLLM({
    provider: "ollama",
    model: config.OLLAMA_CODE_MODEL, // qwen3:8b
    temperature: 0.3,
    maxTokens: 4096,
    ...overrides,
  });
}

/**
 * Tier 3 LLM — highest intelligence, cloud-based fallback.
 * Only available if a cloud API key is configured.
 * Falls back to Tier 2 if no cloud key is present.
 */
export function createTier3LLM(overrides: Partial<LLMOptions> = {}): BaseChatModel {
  // Check if a cloud provider is available
  if (config.ANTHROPIC_API_KEY) {
    log.info("Tier 3: Using Anthropic Claude");
    return createLLM({
      provider: "anthropic",
      temperature: 0.3,
      maxTokens: 8192,
      ...overrides,
    });
  }

  if (config.OPENAI_API_KEY) {
    log.info("Tier 3: Using OpenAI GPT-4o");
    return createLLM({
      provider: "openai",
      temperature: 0.3,
      maxTokens: 8192,
      ...overrides,
    });
  }

  // Fallback to Tier 2 local model
  log.warn("No cloud API key found, Tier 3 falling back to Tier 2 (local)");
  return createTier2LLM(overrides);
}
