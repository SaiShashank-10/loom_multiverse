import { pgTable, uuid, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { projects } from "./projects.js";

/**
 * Architecture Decision Records (ADRs) table.
 *
 * Every time the Build agent makes an architectural choice (database, library,
 * schema design), it writes a permanent ADR. This enables the "Self-Healing"
 * ADR feature: when a founder requests a change that conflicts with a past
 * decision, the Orchestrator can warn them with full context.
 */
export const adrs = pgTable("adrs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  phase: varchar("phase", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  context: text("context").notNull(),
  decision: text("decision").notNull(),
  rationale: text("rationale").notNull(),
  consequences: text("consequences").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("accepted"),
  supersededBy: uuid("superseded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adrRelations = relations(adrs, ({ one }) => ({
  project: one(projects, {
    fields: [adrs.projectId],
    references: [projects.id],
  }),
}));
