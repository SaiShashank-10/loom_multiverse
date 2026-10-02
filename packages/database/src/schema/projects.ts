import { pgTable, uuid, text, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { phases } from "./phases.js";
import { adrs } from "./adrs.js";
import { feedItems } from "./feed.js";
import { integrations } from "./integrations.js";
import { users } from "./accounts.js";

/**
 * Projects table — each row represents a founder's project.
 * This is the central entity that all phases, ADRs, and integrations reference.
 */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id").references(()=>users.id, {onDelete:"cascade"}),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  founderPrompt: text("founder_prompt").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  techStack: jsonb("tech_stack").$type<Record<string, string>>(),
  architecture: jsonb("architecture").$type<Record<string, unknown>>(),
  repositoryUrl: text("repository_url"),
  deployedUrl: text("deployed_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("projects_owner_idx").on(table.ownerId)]);

export const projectRelations = relations(projects, ({ many }) => ({
  phases: many(phases),
  adrs: many(adrs),
  feedItems: many(feedItems),
  integrations: many(integrations),
}));
