/**
 * Shared TypeScript types for Loom Multiverse.
 *
 * These types define the core domain model used across all packages.
 * Keep these in sync with the database schema.
 */

/** Status of a founder's project through the pipeline */
export type ProjectStatus =
  | "draft"
  | "idea_check"
  | "planning"
  | "designing"
  | "building"
  | "testing"
  | "launching"
  | "deployed"
  | "failed"
  | "paused";

/** The 6 phases of the agent pipeline */
export type PhaseType =
  | "idea_check"
  | "planning"
  | "design"
  | "build"
  | "test"
  | "launch";

/** Roles of the specialized agents */
export type AgentRole =
  | "orchestrator"
  | "idea_check"
  | "planning"
  | "design"
  | "build"
  | "test"
  | "launch"
  | "feed_aggregator";

/** QA swarm persona types */
export type PersonaType =
  | "hacker"
  | "confused_user"
  | "power_user";

/** A news/market item from the Founder Feed */
export interface FeedItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: Date;
  scrapedAt: Date;
  relevanceScore: number;
  domain: string;
  tags: string[];
  sentiment: "positive" | "negative" | "neutral";
}

/** Architecture Decision Record */
export interface ADRRecord {
  id: string;
  projectId: string;
  phase: PhaseType;
  title: string;
  context: string;
  decision: string;
  rationale: string;
  consequences: string;
  status: "proposed" | "accepted" | "deprecated" | "superseded";
  createdAt: Date;
  updatedAt: Date;
  supersededBy?: string;
}

/** Result from a phase agent's execution */
export interface PhaseResult {
  phaseType: PhaseType;
  status: "success" | "failure" | "needs_review" | "blocked";
  output: Record<string, unknown>;
  artifacts: string[];
  adrs: ADRRecord[];
  nextPhase?: PhaseType;
  blockedReason?: string;
  executionTimeMs: number;
}

/** MCP Tool definition */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverName: string;
}

/** Integration config for a project */
export interface IntegrationConfig {
  id: string;
  projectId: string;
  service: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: Date;
}
