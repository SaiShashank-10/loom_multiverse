/**
 * @loom/agents — RAG Retriever
 *
 * Unified semantic search across all vector memory namespaces.
 * Agents use this to retrieve relevant context from:
 * - Uploaded documents (namespace: "document_upload")
 * - Idea check summaries (namespace: "idea_check_summary")
 * - Technical plans (namespace: "technical_plan")
 * - Any other stored memory
 */

import { createLogger } from "@loom/shared/logger";
import { createDatabaseClient, VectorStore } from "@loom/database";
import { config } from "@loom/shared/config";
import { embedText } from "../llm/index.js";

const log = createLogger("rag:retriever");

// Shared DB connection
const db = createDatabaseClient(config.DATABASE_URL);
const vectorStore = new VectorStore(db);

export interface RetrievalResult {
  content: string;
  namespace: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export class RagRetriever {
  /**
   * Retrieve the most relevant chunks from vector memory for a given query.
   *
   * @param projectId - Scope search to this project
   * @param query - Natural language query to search for
   * @param options - Filtering and pagination options
   * @returns Array of matching text chunks ordered by relevance
   */
  async retrieve(
    projectId: string,
    query: string,
    options: {
      namespace?: string;
      limit?: number;
      minSimilarity?: number;
    } = {},
  ): Promise<RetrievalResult[]> {
    const { namespace, limit = 10, minSimilarity = 0.5 } = options;

    log.info({ projectId, query: query.substring(0, 100), namespace }, "Performing RAG retrieval");

    // 1. Embed the query
    const queryEmbedding = await embedText(query);

    // 2. Search vector store
    const results = await vectorStore.search(queryEmbedding, projectId, {
      namespace,
      limit,
      minSimilarity,
    });

    log.info({ projectId, matchCount: results.length }, "RAG retrieval complete");

    // 3. Map to clean result format
    return (results as any[]).map((row) => ({
      content: row.content as string,
      namespace: row.namespace as string,
      similarity: row.similarity as number,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  }

  /**
   * Retrieve relevant chunks and format them as a context string
   * ready to be injected into an LLM prompt.
   *
   * @param projectId - Scope search to this project
   * @param query - Natural language query
   * @param options - Retrieval options
   * @returns Formatted context string with source attribution
   */
  async retrieveAsContext(
    projectId: string,
    query: string,
    options: {
      namespace?: string;
      limit?: number;
      minSimilarity?: number;
    } = {},
  ): Promise<string> {
    const results = await this.retrieve(projectId, query, options);

    if (results.length === 0) {
      return "";
    }

    const contextParts = results.map((r, i) => {
      const source = r.metadata?.fileName
        ? `[Source: ${r.metadata.fileName}, Chunk ${r.metadata.chunkIndex}]`
        : `[Source: ${r.namespace}]`;
      return `--- Context ${i + 1} (Relevance: ${(r.similarity * 100).toFixed(1)}%) ${source} ---\n${r.content}`;
    });

    return contextParts.join("\n\n");
  }

  /**
   * Retrieve context from uploaded documents only.
   * Convenience method for document-specific retrieval.
   */
  async retrieveFromDocuments(
    projectId: string,
    query: string,
    limit: number = 5,
  ): Promise<string> {
    return this.retrieveAsContext(projectId, query, {
      namespace: "document_upload",
      limit,
      minSimilarity: 0.4, // Lower threshold for uploaded docs since they're directly relevant
    });
  }
}
