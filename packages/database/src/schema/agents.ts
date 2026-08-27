import { pgTable, uuid, text, timestamp, jsonb, varchar, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Agents table — stores agent configurations and current state.
 * Used by the orchestrator to manage agent lifecycle.
 */
export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: varchar("role", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt"),
  model: varchar("model", { length: 100 }).notNull().default("qwen3:4b"),
  temperature: varchar("temperature", { length: 10 }).notNull().default("0.3"),
  tools: jsonb("tools").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentRelations = relations(agents, () => ({}));
