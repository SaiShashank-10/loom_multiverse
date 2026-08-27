/**
 * Custom error classes for Loom Multiverse.
 *
 * Each error carries a `code` for programmatic handling and
 * a `statusCode` for HTTP response mapping.
 */

export class LoomError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code = "LOOM_ERROR",
    statusCode = 500,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/** Errors originating from AI agent execution */
export class AgentError extends LoomError {
  constructor(
    message: string,
    public readonly agentRole: string,
    public readonly phase?: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "AGENT_ERROR", 500, { agentRole, phase, ...context });
  }
}

/** Errors from database operations */
export class DatabaseError extends LoomError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "DATABASE_ERROR", 500, context);
  }
}

/** Errors from MCP server/client communication */
export class MCPError extends LoomError {
  constructor(
    message: string,
    public readonly serverName: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "MCP_ERROR", 502, { serverName, ...context });
  }
}

/** Input validation errors */
export class ValidationError extends LoomError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, context);
  }
}

/** Resource not found errors */
export class NotFoundError extends LoomError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, "NOT_FOUND", 404, {
      resource,
      identifier,
    });
  }
}
