import { Context } from "hono";
import { LoomError } from "@loom/shared/errors";
import { createLogger } from "@loom/shared/logger";

const log = createLogger("api-error");

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof LoomError) {
    // Known application error
    if (err.statusCode >= 500) {
      log.error({ code: err.code, message: err.message, context: err.context }, "Unhandled LoomError");
    }
    return c.json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.context
      }
    }, err.statusCode as any);
  }

  // Unknown generic error
  log.error({ error: String(err), stack: err.stack }, "Unhandled Exception");
  return c.json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
      details: null
    }
  }, 500);
};
