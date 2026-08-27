/**
 * System-wide constants for Loom Multiverse.
 */

import type { PhaseType, AgentRole, PersonaType, ProjectStatus } from "./types.js";

/** The 6 phases in execution order */
export const PHASES: readonly PhaseType[] = [
  "idea_check",
  "planning",
  "design",
  "build",
  "test",
  "launch",
] as const;

/** All agent roles in the system */
export const AGENT_ROLES: readonly AgentRole[] = [
  "orchestrator",
  "idea_check",
  "planning",
  "design",
  "build",
  "test",
  "launch",
  "feed_aggregator",
] as const;

/** QA persona types */
export const PERSONA_TYPES: readonly PersonaType[] = [
  "hacker",
  "confused_user",
  "power_user",
] as const;

/** Valid project statuses */
export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "draft",
  "idea_check",
  "planning",
  "designing",
  "building",
  "testing",
  "launching",
  "deployed",
  "failed",
  "paused",
] as const;

/** Pre-built MCP server identifiers */
export const MCP_SERVER_NAMES = {
  STRIPE: "stripe",
  RESEND: "resend",
  POSTHOG: "posthog",
  E2B: "e2b",
  VERCEL: "vercel",
  GITHUB: "github",
  LINEAR: "linear",
} as const;

/** Embedding dimensions for pgvector (OpenAI text-embedding-3-small) */
export const EMBEDDING_DIMENSIONS = 1536;

/** Maximum context window tokens per agent call */
export const MAX_CONTEXT_TOKENS = 128_000;

/** Default phase timeout in milliseconds (10 minutes) */
export const DEFAULT_PHASE_TIMEOUT_MS = 10 * 60 * 1000;

/** News sources for the Founder Feed */
export const FEED_SOURCES = {
  INDIA_TODAY: {
    name: "India Today",
    url: "https://www.indiatoday.in",
    rssUrl: "https://www.indiatoday.in/rss/home",
    category: "general",
  },
  HINDUSTAN_TIMES: {
    name: "Hindustan Times",
    url: "https://www.hindustantimes.com",
    rssUrl: "https://www.hindustantimes.com/feeds/rss/technology/rssfeed.xml",
    category: "technology",
  },
  ECONOMIC_TIMES: {
    name: "The Economic Times",
    url: "https://economictimes.indiatimes.com",
    rssUrl: "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
    category: "business",
  },
  TELANGANA_TODAY: {
    name: "Telangana Today",
    url: "https://telanganatoday.com",
    rssUrl: "https://telanganatoday.com/feed",
    category: "regional",
  },
  TECHCRUNCH: {
    name: "TechCrunch",
    url: "https://techcrunch.com",
    rssUrl: "https://techcrunch.com/feed/",
    category: "startup",
  },
  HACKER_NEWS: {
    name: "Hacker News",
    url: "https://news.ycombinator.com",
    apiUrl: "https://hacker-news.firebaseio.com/v0",
    category: "tech",
  },
  PRODUCT_HUNT: {
    name: "Product Hunt",
    url: "https://www.producthunt.com",
    category: "products",
  },
  MINT: {
    name: "Livemint",
    url: "https://www.livemint.com",
    rssUrl: "https://www.livemint.com/rss/technology",
    category: "business",
  },
  NDTV: {
    name: "NDTV",
    url: "https://www.ndtv.com",
    rssUrl: "https://feeds.feedburner.com/ndtvnews-top-stories",
    category: "general",
  },
  THE_HINDU: {
    name: "The Hindu",
    url: "https://www.thehindu.com",
    rssUrl: "https://www.thehindu.com/feeder/default.rss",
    category: "general",
  },
} as const;
