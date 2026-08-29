/**
 * @loom/agents — Embedding Provider
 *
 * Creates embedding instances for vector store operations.
 * Supports:
 * - Ollama nomic-embed-text (768 dimensions, FREE)
 * - OpenAI text-embedding-3-small (1536 dimensions, PAID)
 *
 * The embedding provider is configured via EMBEDDING_PROVIDER in .env.
 * Dimension detection is automatic based on the provider.
 */

import { OllamaEmbeddings } from "@langchain/ollama";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { Embeddings } from "@langchain/core/embeddings";
import { createLogger } from "@loom/shared/logger";
import { config } from "@loom/shared/config";
import { EMBEDDING_DIMENSIONS } from "@loom/shared/constants";
import { AgentError } from "@loom/shared/errors";

const log = createLogger("embedding-provider");

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

/** Supported embedding provider identifiers */
export type EmbeddingProvider = "ollama" | "openai";

/** Options for creating an embedding instance */
export interface EmbeddingOptions {
  /** Which provider to use. Defaults to config.EMBEDDING_PROVIDER */
  provider?: EmbeddingProvider;
  /** Model name. Defaults to provider's default embedding model */
  model?: string;
}

// ─────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────

/**
 * Creates an embedding instance based on the specified provider.
 *
 * @param options - Provider and model selection
 * @returns A LangChain Embeddings instance
 *
 * @example
 * ```typescript
 * const embeddings = createEmbeddings(); // uses EMBEDDING_PROVIDER from .env
 * const vector = await embeddings.embedQuery("What is this project about?");
 * // vector.length === 768 (ollama) or 1536 (openai)
 * ```
 */
export function createEmbeddings(options: EmbeddingOptions = {}): Embeddings {
  const provider = options.provider ?? (config.EMBEDDING_PROVIDER as EmbeddingProvider);

  log.debug({ provider, model: options.model }, "Creating embedding instance");

  switch (provider) {
    case "ollama": {
      const model = options.model ?? config.OLLAMA_EMBED_MODEL;
      log.info(
        { provider, model, dimensions: EMBEDDING_DIMENSIONS.ollama },
        "Using Ollama embeddings (free, 768d)",
      );

      return new OllamaEmbeddings({
        baseUrl: config.OLLAMA_BASE_URL,
        model,
      });
    }

    case "openai": {
      const apiKey = config.OPENAI_API_KEY;
      if (!apiKey) {
        throw new AgentError(
          "OPENAI_API_KEY is required when EMBEDDING_PROVIDER is 'openai'",
          "embedding-provider",
          undefined,
          { provider },
        );
      }

      const model = options.model ?? "text-embedding-3-small";
      log.info(
        { provider, model, dimensions: EMBEDDING_DIMENSIONS.openai },
        "Using OpenAI embeddings (paid, 1536d)",
      );

      return new OpenAIEmbeddings({
        openAIApiKey: apiKey,
        modelName: model,
      });
    }

    default: {
      const exhaustive: never = provider;
      throw new AgentError(
        `Unknown embedding provider: ${exhaustive}`,
        "embedding-provider",
      );
    }
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Embed a single text string into a vector.
 *
 * @param text - The text to embed
 * @param options - Provider options
 * @returns The embedding vector (number array)
 */
export async function embedText(
  text: string,
  options: EmbeddingOptions = {},
): Promise<number[]> {
  const embeddings = createEmbeddings(options);
  return embeddings.embedQuery(text);
}

/**
 * Embed multiple text strings in batch.
 * Batching is important on low-VRAM GPUs (like RTX 3050 Ti 4GB)
 * to avoid OOM errors.
 *
 * @param texts - Array of texts to embed
 * @param options - Provider options
 * @param batchSize - Number of texts per batch (default: 10)
 * @returns Array of embedding vectors
 */
export async function embedBatch(
  texts: string[],
  options: EmbeddingOptions = {},
  batchSize = 10,
): Promise<number[][]> {
  const embeddings = createEmbeddings(options);
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    log.debug(
      { batch: `${i + 1}-${i + batch.length}/${texts.length}` },
      "Embedding batch",
    );

    const batchResults = await embeddings.embedDocuments(batch);
    results.push(...batchResults);

    // Small delay between batches to prevent Ollama overload on 4GB VRAM
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Get the expected embedding dimensions for the current provider.
 *
 * @param provider - The embedding provider (defaults to config)
 * @returns Number of dimensions (768 for Ollama, 1536 for OpenAI)
 */
export function getEmbeddingDimensions(provider?: EmbeddingProvider): number {
  const p = provider ?? (config.EMBEDDING_PROVIDER as EmbeddingProvider);
  return EMBEDDING_DIMENSIONS[p] ?? EMBEDDING_DIMENSIONS.ollama;
}
