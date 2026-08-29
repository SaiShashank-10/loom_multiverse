/**
 * @loom/agents — LLM Layer
 *
 * Provider-agnostic LLM and embedding abstractions.
 * Agents use these to interact with language models without
 * being tied to a specific provider.
 */

// LLM Provider
export {
  createLLM,
  createTier1LLM,
  createTier2LLM,
  createTier3LLM,
} from "./provider.js";
export type { LLMProvider, LLMOptions } from "./provider.js";

// Embeddings
export {
  createEmbeddings,
  embedText,
  embedBatch,
  getEmbeddingDimensions,
} from "./embeddings.js";
export type { EmbeddingProvider, EmbeddingOptions } from "./embeddings.js";
