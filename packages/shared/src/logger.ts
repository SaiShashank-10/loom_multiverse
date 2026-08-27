import pino from "pino";

/**
 * Creates a Pino logger instance with structured logging.
 * Each module/agent gets its own child logger with a `module` field
 * for easy filtering in production.
 *
 * @param module - The module name (e.g., "orchestrator", "idea-check-agent")
 * @returns A child logger instance scoped to the module
 */
export function createLogger(module: string) {
  return logger.child({ module });
}

/**
 * Root logger for Loom Multiverse.
 *
 * Configuration:
 * - Development: pretty-printed, colorized output
 * - Production: JSON structured logs for log aggregation
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  base: {
    service: "loom-multiverse",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});
