import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  real,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { projects } from "./projects.js";

/**
 * Feed Items table — stores scraped news articles from legitimate sources.
 *
 * Sources include: India Today, Hindustan Times, The Economic Times,
 * Telangana Today, TechCrunch, Hacker News, ProductHunt, Livemint, NDTV, The Hindu.
 *
 * Each item is scored for relevance to the founder's project domain.
 */
export const feedItems = pgTable(
  "feed_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 1000 }).notNull(),
    summary: text("summary"),
    url: text("url").notNull(),
    source: varchar("source", { length: 100 }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
    relevanceScore: real("relevance_score").notNull().default(0),
    domain: varchar("domain", { length: 255 }),
    tags: jsonb("tags").$type<string[]>().default([]),
    sentiment: varchar("sentiment", { length: 20 }).default("neutral"),
    rawContent: text("raw_content"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("feed_project_idx").on(table.projectId),
    index("feed_source_idx").on(table.source),
    index("feed_relevance_idx").on(table.relevanceScore),
    index("feed_published_idx").on(table.publishedAt),
  ],
);

export const feedItemRelations = relations(feedItems, ({ one }) => ({
  project: one(projects, {
    fields: [feedItems.projectId],
    references: [projects.id],
  }),
}));
