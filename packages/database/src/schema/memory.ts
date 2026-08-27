import { pgTable, uuid, text, timestamp, varchar, index, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Memory table — stores vector embeddings for semantic retrieval.
 *
 * Uses pgvector's `vector(1536)` type for OpenAI text-embedding-3-small dimensions.
 * Agents write embeddings here for project context, code summaries, and decisions.
 * The orchestrator queries this for context-aware routing.
 *
 * Note: The `embedding` column uses a raw SQL type because Drizzle ORM
 * doesn't have native pgvector support. We handle it via custom SQL.
 */
export const memory = pgTable(
  "memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull(),
    namespace: varchar("namespace", { length: 100 }).notNull(),
    content: text("content").notNull(),
    embedding: text("embedding"), // Stored as vector(1536) via migration SQL
    metadata: text("metadata"), // JSON stringified metadata
    agentRole: varchar("agent_role", { length: 50 }),
    phase: varchar("phase", { length: 50 }),
    chunkIndex: integer("chunk_index").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("memory_project_idx").on(table.projectId),
    index("memory_namespace_idx").on(table.namespace),
    index("memory_agent_role_idx").on(table.agentRole),
  ],
);
