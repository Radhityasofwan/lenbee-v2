const REQUIRED = ["DATABASE_URL"] as const;

function read(key: string, fallback?: string): string {
  const value = process.env[key];
  if (value && value.length > 0) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${key}`);
}

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0 && process.env.NODE_ENV !== "test") {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",

  databaseUrl: read("DATABASE_URL", "mysql://root@127.0.0.1:3306/lenbee"),

  // Session cookie lifetime (days)
  sessionTtlDays: Number(read("SESSION_TTL_DAYS", "30")),
  sessionCookieName: read("SESSION_COOKIE_NAME", "lenbee_session"),

  storageDriver: read("STORAGE_DRIVER", "local") as "local" | "s3",

  ai: {
    provider: read("AI_PROVIDER", "auto") as "auto" | "anthropic" | "openai" | "none",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
    anthropicModel: read("ANTHROPIC_MODEL", "claude-sonnet-5"),
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiBaseUrl: read("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    openaiModel: read("OPENAI_MODEL", "gpt-4o-mini"),
    timeoutMs: Number(read("AI_TIMEOUT_MS", "45000")),
    maxOutputTokens: Number(read("AI_MAX_OUTPUT_TOKENS", "2000")),
    // Secret for encrypting stored provider keys. When unset the database
    // credential is used as the derivation source, so keys are never at rest
    // in plaintext even without extra configuration.
    keySecret: process.env.AI_KEY_SECRET ?? "",
  },

  uploads: {
    maxFileSizeBytes: Number(read("UPLOAD_MAX_BYTES", String(10 * 1024 * 1024))),
    maxFilesPerRequest: Number(read("UPLOAD_MAX_FILES", "10")),
  },

  push: {
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    vapidSubject: read("VAPID_SUBJECT", "mailto:admin@lenbee.id"),
  },

  cronSecret: process.env.CRON_SECRET ?? "",
} as const;

export function isPushConfigured(): boolean {
  return env.push.vapidPublicKey.length > 0 && env.push.vapidPrivateKey.length > 0;
}

export function isAiConfigured(): boolean {
  if (env.ai.provider === "none") return false;
  if (env.ai.provider === "anthropic") return env.ai.anthropicApiKey.length > 0;
  if (env.ai.provider === "openai") return env.ai.openaiApiKey.length > 0;
  return env.ai.anthropicApiKey.length > 0 || env.ai.openaiApiKey.length > 0;
}

export function activeAiProvider(): "anthropic" | "openai" | "none" {
  if (env.ai.provider === "anthropic") return env.ai.anthropicApiKey ? "anthropic" : "none";
  if (env.ai.provider === "openai") return env.ai.openaiApiKey ? "openai" : "none";
  if (env.ai.provider === "none") return "none";
  if (env.ai.anthropicApiKey) return "anthropic";
  if (env.ai.openaiApiKey) return "openai";
  return "none";
}
