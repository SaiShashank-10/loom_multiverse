import { z } from "zod";

/**
 * Environment configuration schema.
 * Validates all required environment variables at startup.
 * Uses Zod for runtime validation — crashes fast if config is invalid.
 */
const configSchema = z.object({
  // Node
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // API Server
  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default("0.0.0.0"),

  // Database
  DATABASE_URL: z.string().url().startsWith("postgresql://"),

  // Redis
  REDIS_URL: z.string().url().startsWith("redis://"),

  // LLM Provider Strategy
  // "ollama" = free local models (default)
  // "anthropic" = Claude API (paid fallback)
  // "openai" = OpenAI API (paid fallback)
  LLM_PROVIDER: z.enum(["ollama", "anthropic", "openai"]).default("ollama"),

  // Ollama (Local — FREE)
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("qwen3:4b"),
  OLLAMA_CODE_MODEL: z.string().default("qwen3:8b"),
  OLLAMA_EMBED_MODEL: z.string().default("nomic-embed-text"),

  // Embedding Provider — "ollama" uses nomic-embed-text (768 dims, FREE)
  // "openai" uses text-embedding-3-small (1536 dims, PAID)
  EMBEDDING_PROVIDER: z.enum(["ollama", "openai"]).default("ollama"),

  // Cloud LLM Providers (optional paid fallback)
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),

  // E2B Sandbox
  E2B_API_KEY: z.string().min(1).optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Resend
  RESEND_API_KEY: z.string().min(1).optional(),

  // PostHog
  POSTHOG_API_KEY: z.string().min(1).optional(),
  POSTHOG_HOST: z.string().url().optional(),

  // Linear
  LINEAR_API_KEY: z.string().min(1).optional(),
  LINEAR_TEAM_ID: z.string().min(1).optional(),
  LINEAR_WEBHOOK_SECRET: z.string().min(1).optional(),

  // GitHub
  GITHUB_TOKEN: z.string().min(1).optional(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Auth
  JWT_SECRET: z.string().min(32).default("change-this-to-a-random-64-char-string"),
  SESSION_SECRET: z.string().min(32).default("change-this-to-another-random-64-char-string"),

  // Founder Feed
  FEED_REFRESH_INTERVAL_MINUTES: z.coerce.number().default(30),

  // Logging
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

export type AppConfig = z.infer<typeof configSchema>;

/**
 * Validated application configuration.
 *
 * Call this function to parse and validate environment variables.
 * Throws a detailed Zod error at startup if any required var is missing.
 *
 * @returns Validated config object
 * @throws ZodError with details of all invalid/missing variables
 */
export function loadConfig(): AppConfig {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.format();
    console.error("❌ Invalid environment configuration:");
    console.error(JSON.stringify(formatted, null, 2));
    throw new Error("Environment validation failed. See errors above.");
  }

  return result.data;
}

/**
 * Lazy-loaded config singleton.
 * First access triggers validation. Subsequent accesses return the cached config.
 */
let _config: AppConfig | null = null;

export const config = new Proxy({} as AppConfig, {
  get(_target, prop: string) {
    if (!_config) {
      _config = loadConfig();
    }
    return _config[prop as keyof AppConfig];
  },
});
