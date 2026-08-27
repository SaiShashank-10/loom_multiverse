import type { Database } from "./client.js";
import { memory } from "./schema/memory.js";
import { sql, eq, desc } from "drizzle-orm";
import { createLogger } from "@loom/shared/logger";

const log = createLogger("vector-store");

/**
 * Vector similarity search utilities for pgvector.
 *
 * Uses cosine distance (<=> operator) for semantic retrieval.
 * Embeddings are stored as vector(1536) matching OpenAI text-embedding-3-small.
 */
export class VectorStore {
  constructor(private db: Database) {}

  /**
   * Store a text embedding in the memory table.
   */
  async store(params: {
    projectId: string;
    namespace: string;
    content: string;
    embedding: number[];
    agentRole?: string;
    phase?: string;
    metadata?: Record<string, unknown>;
  }) {
    const embeddingStr = `[${params.embedding.join(",")}]`;

    await this.db.execute(sql`
      INSERT INTO memory (project_id, namespace, content, embedding, agent_role, phase, metadata)
      VALUES (
        ${params.projectId},
        ${params.namespace},
        ${params.content},
        ${embeddingStr}::vector(1536),
        ${params.agentRole ?? null},
        ${params.phase ?? null},
        ${params.metadata ? JSON.stringify(params.metadata) : null}
      )
    `);

    log.debug({ namespace: params.namespace }, "Stored embedding");
  }

  /**
   * Semantic similarity search — finds the most relevant memories.
   *
   * @param embedding - Query embedding vector
   * @param projectId - Scope search to a project
   * @param options - Filtering and pagination options
   * @returns Array of matching memory entries ordered by similarity
   */
  async search(
    embedding: number[],
    projectId: string,
    options: {
      namespace?: string;
      limit?: number;
      minSimilarity?: number;
    } = {},
  ) {
    const { namespace, limit = 10, minSimilarity = 0.7 } = options;
    const embeddingStr = `[${embedding.join(",")}]`;

    const results = await this.db.execute(sql`
      SELECT
        id,
        project_id,
        namespace,
        content,
        agent_role,
        phase,
        metadata,
        1 - (embedding <=> ${embeddingStr}::vector(1536)) as similarity,
        created_at
      FROM memory
      WHERE project_id = ${projectId}
        ${namespace ? sql`AND namespace = ${namespace}` : sql``}
        AND 1 - (embedding <=> ${embeddingStr}::vector(1536)) >= ${minSimilarity}
      ORDER BY embedding <=> ${embeddingStr}::vector(1536)
      LIMIT ${limit}
    `);

    log.debug({ projectId, matches: results.length }, "Vector search completed");
    return results;
  }

  /**
   * Delete all memories for a project in a given namespace.
   */
  async clearNamespace(projectId: string, namespace: string) {
    await this.db
      .delete(memory)
      .where(
        sql`${memory.projectId} = ${projectId} AND ${memory.namespace} = ${namespace}`,
      );

    log.info({ projectId, namespace }, "Cleared memory namespace");
  }
}
