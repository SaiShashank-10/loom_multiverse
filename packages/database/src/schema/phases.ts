import { pgTable, uuid, text, timestamp, jsonb, varchar, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { projects } from "./projects.js";

/**
 * Phases table — tracks execution of each pipeline phase for a project.
 * Each phase produces artifacts and may generate ADRs.
 */
export const phases = pgTable("phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  phaseType: varchar("phase_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  input: jsonb("input").$type<Record<string, unknown>>().default({}),
  output: jsonb("output").$type<Record<string, unknown>>().default({}),
  artifacts: jsonb("artifacts").$type<string[]>().default([]),
  errorMessage: text("error_message"),
  executionTimeMs: integer("execution_time_ms"),
  retryCount: integer("retry_count").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const phaseRelations = relations(phases, ({ one }) => ({
  project: one(projects, {
    fields: [phases.projectId],
    references: [projects.id],
  }),
}));
