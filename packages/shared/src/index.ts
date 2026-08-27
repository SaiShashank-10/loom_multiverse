/**
 * @loom/shared — Shared utilities for Loom Multiverse
 *
 * This package provides foundational utilities used across all packages:
 * - Structured logging (Pino)
 * - Environment config validation (Zod)
 * - Custom error classes
 * - Shared TypeScript types
 * - System-wide constants
 */

export { logger, createLogger } from "./logger.js";
export { config, type AppConfig } from "./config.js";
export {
  LoomError,
  AgentError,
  DatabaseError,
  MCPError,
  ValidationError,
  NotFoundError,
} from "./errors.js";
export type {
  ProjectStatus,
  PhaseType,
  AgentRole,
  PersonaType,
  FeedItem,
  ADRRecord,
  PhaseResult,
} from "./types.js";
export {
  PHASES,
  AGENT_ROLES,
  PERSONA_TYPES,
  PROJECT_STATUSES,
  MCP_SERVER_NAMES,
  EMBEDDING_DIMENSIONS,
  DEFAULT_EMBEDDING_DIMS,
} from "./constants.js";
