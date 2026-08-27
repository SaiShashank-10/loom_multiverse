import { pgTable, uuid, text, timestamp, varchar, boolean, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { projects } from "./projects.js";

/**
 * Integrations table — stores MCP integration configs per project.
 *
 * When a founder enables "Add Subscription Billing", this table
 * stores the Stripe MCP config. The Orchestrator reads this to
 * know which MCP servers to connect for each project.
 */
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  service: varchar("service", { length: 100 }).notNull(),
  displayName: varchar("display_name", { length: 255 }).notNull(),
  enabled: boolean("enabled").notNull().default(false),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  credentials: jsonb("credentials").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const integrationRelations = relations(integrations, ({ one }) => ({
  project: one(projects, {
    fields: [integrations.projectId],
    references: [projects.id],
  }),
}));
