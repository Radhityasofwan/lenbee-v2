import "server-only";
import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  aiApiKeys,
  aiModels,
  type AiHealthStatus,
  type AiProviderId,
} from "@/db/schema";
import { decryptSecret, encryptSecret, keyHint } from "@/lib/ai/key-crypto";
import {
  PROVIDERS,
  PROVIDER_IDS,
  ProviderError,
  type ProviderImage,
  type ProviderModel,
} from "@/lib/ai/providers";
import { env } from "@/lib/env";

export class AiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiKeyError";
  }
}

const COOLDOWN_MS = 5 * 60 * 1000;
const MAX_MODELS_PER_KEY = 3;
const MAX_ERROR_CHARS = 400;

const KEY_COLUMNS = {
  id: aiApiKeys.id,
  alias: aiApiKeys.alias,
  provider: aiApiKeys.provider,
  keyHint: aiApiKeys.keyHint,
  baseUrl: aiApiKeys.baseUrl,
  modelAllowed: aiApiKeys.modelAllowed,
  priority: aiApiKeys.priority,
  isActive: aiApiKeys.isActive,
  healthStatus: aiApiKeys.healthStatus,
  cooldownUntil: aiApiKeys.cooldownUntil,
  lastHealthCheck: aiApiKeys.lastHealthCheck,
  lastErrorMessage: aiApiKeys.lastErrorMessage,
  createdAt: aiApiKeys.createdAt,
};

export type AiKeySummary = {
  id: number;
  alias: string;
  provider: AiProviderId;
  keyHint: string | null;
  baseUrl: string | null;
  modelAllowed: string[] | null;
  priority: number;
  isActive: boolean;
  healthStatus: AiHealthStatus;
  cooldownUntil: Date | null;
  lastHealthCheck: Date | null;
  lastErrorMessage: string | null;
  createdAt: Date;
};

/** Only the routing path needs the ciphertext; `AiKeySummary` never carries it. */
type AiRoutingKey = AiKeySummary & { apiKeyEncrypted: string };

const ROUTING_COLUMNS = { ...KEY_COLUMNS, apiKeyEncrypted: aiApiKeys.apiKeyEncrypted };

export interface AiModelSummary extends ProviderModel {
  provider: AiProviderId;
  isActive: boolean;
  syncedAt: Date;
}

export interface SyncReport {
  provider: AiProviderId;
  ok: boolean;
  count: number;
  error?: string;
}

function trimError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_CHARS);
}

function requireProvider(value: string): AiProviderId {
  if (!PROVIDER_IDS.includes(value as AiProviderId)) {
    throw new AiKeyError(`Provider "${value}" tidak didukung.`);
  }
  return value as AiProviderId;
}

/* ------------------------------- key CRUD -------------------------------- */

export async function listKeys(): Promise<AiKeySummary[]> {
  return db
    .select(KEY_COLUMNS)
    .from(aiApiKeys)
    .orderBy(asc(aiApiKeys.priority), asc(aiApiKeys.id));
}

export async function countActiveKeys(): Promise<number> {
  const rows = await db
    .select({ id: aiApiKeys.id })
    .from(aiApiKeys)
    .where(eq(aiApiKeys.isActive, true));
  return rows.length;
}

export async function createKey(input: {
  alias: string;
  provider: string;
  apiKey: string;
  baseUrl?: string | null;
  priority?: number;
  modelAllowed?: string[] | null;
}): Promise<AiKeySummary> {
  const provider = requireProvider(input.provider);
  const apiKey = input.apiKey.trim();
  if (apiKey.length < 8) throw new AiKeyError("API key terlalu pendek.");

  const [inserted] = await db
    .insert(aiApiKeys)
    .values({
      alias: input.alias.trim(),
      provider,
      apiKeyEncrypted: encryptSecret(apiKey),
      keyHint: keyHint(apiKey),
      baseUrl: input.baseUrl?.trim() || PROVIDERS[provider].defaultBaseUrl,
      modelAllowed: input.modelAllowed?.length ? input.modelAllowed : null,
      priority: input.priority ?? 100,
    })
    .$returningId();

  const key = await getKey(inserted.id);
  if (!key) throw new AiKeyError("Gagal menyimpan API key.");
  return key;
}

export async function getKey(id: number): Promise<AiKeySummary | null> {
  const [row] = await db.select(KEY_COLUMNS).from(aiApiKeys).where(eq(aiApiKeys.id, id)).limit(1);
  return row ?? null;
}

export async function updateKey(
  id: number,
  patch: {
    alias?: string;
    apiKey?: string;
    baseUrl?: string | null;
    priority?: number;
    isActive?: boolean;
    modelAllowed?: string[] | null;
  },
): Promise<AiKeySummary> {
  const values: Record<string, unknown> = {};

  if (patch.alias !== undefined) values.alias = patch.alias.trim();
  if (patch.baseUrl !== undefined) values.baseUrl = patch.baseUrl?.trim() || null;
  if (patch.priority !== undefined) values.priority = patch.priority;
  if (patch.apiKey !== undefined && patch.apiKey.trim().length > 0) {
    const apiKey = patch.apiKey.trim();
    values.apiKeyEncrypted = encryptSecret(apiKey);
    values.keyHint = keyHint(apiKey);
    // Health describes the credential that was measured, so a replacement
    // starts clean instead of inheriting the old secret's cooldown.
    values.healthStatus = "healthy";
    values.cooldownUntil = null;
    values.lastErrorMessage = null;
  }
  if (patch.isActive !== undefined) {
    values.isActive = patch.isActive;
    if (!patch.isActive) values.healthStatus = "disabled";
    else {
      values.healthStatus = "healthy";
      values.cooldownUntil = null;
      values.lastErrorMessage = null;
    }
  }
  if (patch.modelAllowed !== undefined) {
    values.modelAllowed = patch.modelAllowed?.length ? patch.modelAllowed : null;
  }

  if (Object.keys(values).length > 0) {
    await db.update(aiApiKeys).set(values).where(eq(aiApiKeys.id, id));
  }

  const key = await getKey(id);
  if (!key) throw new AiKeyError("API key tidak ditemukan.");
  return key;
}

export async function deleteKey(id: number): Promise<void> {
  await db.delete(aiApiKeys).where(eq(aiApiKeys.id, id));
}

/* ------------------------------ health state ----------------------------- */

async function markHealthy(id: number): Promise<void> {
  await db
    .update(aiApiKeys)
    .set({ healthStatus: "healthy", cooldownUntil: null, lastErrorMessage: null, lastHealthCheck: new Date() })
    .where(eq(aiApiKeys.id, id));
}

/** Records a key-level failure (bad credentials) without hiding it behind a cooldown. */
async function markKeyError(id: number, message: string): Promise<void> {
  await db
    .update(aiApiKeys)
    .set({ lastErrorMessage: message, lastHealthCheck: new Date() })
    .where(eq(aiApiKeys.id, id));
}

async function markCooldown(id: number, message: string): Promise<void> {
  await db
    .update(aiApiKeys)
    .set({
      healthStatus: "cooldown",
      cooldownUntil: new Date(Date.now() + COOLDOWN_MS),
      lastErrorMessage: message,
      lastHealthCheck: new Date(),
    })
    .where(eq(aiApiKeys.id, id));
}

/* ------------------------------ model sync ------------------------------- */

export async function listModels(): Promise<AiModelSummary[]> {
  const rows = await db
    .select({
      provider: aiModels.provider,
      modelId: aiModels.modelId,
      name: aiModels.name,
      isActive: aiModels.isActive,
      syncedAt: aiModels.syncedAt,
    })
    .from(aiModels)
    .orderBy(asc(aiModels.provider), asc(aiModels.modelId));
  return rows;
}

/** Fetches the live catalogue for one provider and reconciles it into the table. */
export async function syncProviderModels(provider: AiProviderId): Promise<SyncReport> {
  const adapter = PROVIDERS[provider];
  const keys = await db
    .select({ id: aiApiKeys.id, apiKeyEncrypted: aiApiKeys.apiKeyEncrypted, baseUrl: aiApiKeys.baseUrl })
    .from(aiApiKeys)
    .where(and(eq(aiApiKeys.provider, provider), eq(aiApiKeys.isActive, true)))
    .orderBy(asc(aiApiKeys.priority), asc(aiApiKeys.id));

  if (keys.length === 0) {
    return { provider, ok: false, count: 0, error: "Belum ada API key aktif untuk provider ini." };
  }

  // Walk the keys in priority order: one rejected key must not block the whole
  // provider when another active key can still read the catalogue.
  let models: ProviderModel[] | null = null;
  let healthyKeyId: number | null = null;
  let lastError = "";
  for (const key of keys) {
    try {
      models = await adapter.listModels({
        apiKey: decryptSecret(key.apiKeyEncrypted),
        baseUrl: key.baseUrl,
        timeoutMs: env.ai.timeoutMs,
      });
      healthyKeyId = key.id;
      break;
    } catch (error) {
      lastError = trimError(error);
      await db
        .update(aiApiKeys)
        .set({ lastErrorMessage: lastError, lastHealthCheck: new Date() })
        .where(eq(aiApiKeys.id, key.id));
    }
  }

  if (!models || healthyKeyId === null) {
    // Existing rows are deliberately left untouched so routing keeps working
    // with the last known catalogue.
    return { provider, ok: false, count: 0, error: lastError };
  }

  const now = new Date();
  const deduped = new Map(models.map((model) => [model.modelId, model]));
  const rows = [...deduped.values()].map((model) => ({
    provider,
    modelId: model.modelId,
    name: model.name,
    isActive: true,
    syncedAt: now,
  }));

  await db.insert(aiModels).values(rows).onDuplicateKeyUpdate({
    set: { name: sql`values(name)`, isActive: true, syncedAt: now },
  });

  const ids = [...deduped.keys()];
  const stale = await db
    .select({ id: aiModels.id })
    .from(aiModels)
    .where(and(eq(aiModels.provider, provider), notInArray(aiModels.modelId, ids)));
  if (stale.length > 0) {
    await db
      .update(aiModels)
      .set({ isActive: false })
      .where(inArray(aiModels.id, stale.map((row) => row.id)));
  }

  await markHealthy(healthyKeyId);
  return { provider, ok: true, count: rows.length };
}

export async function syncAllProviderModels(): Promise<SyncReport[]> {
  return Promise.all(PROVIDER_IDS.map((provider) => syncProviderModels(provider)));
}

/* ------------------------------ key testing ------------------------------ */

export interface KeyTestResult {
  id: number;
  alias: string;
  ok: boolean;
  modelCount: number;
  sample?: string;
  error?: string;
}

/** Never returns the key itself — only the outcome. */
export async function testKey(id: number): Promise<KeyTestResult> {
  const [row] = await db
    .select({
      id: aiApiKeys.id,
      alias: aiApiKeys.alias,
      provider: aiApiKeys.provider,
      apiKeyEncrypted: aiApiKeys.apiKeyEncrypted,
      baseUrl: aiApiKeys.baseUrl,
    })
    .from(aiApiKeys)
    .where(eq(aiApiKeys.id, id))
    .limit(1);

  if (!row) throw new AiKeyError("API key tidak ditemukan.");

  try {
    const models = await PROVIDERS[row.provider].listModels({
      apiKey: decryptSecret(row.apiKeyEncrypted),
      baseUrl: row.baseUrl,
      timeoutMs: env.ai.timeoutMs,
    });
    await markHealthy(id);
    return {
      id,
      alias: row.alias,
      ok: true,
      modelCount: models.length,
      sample: models.slice(0, 3).map((model) => model.name).join(", "),
    };
  } catch (error) {
    const message = trimError(error);
    const retryable = error instanceof ProviderError ? error.retryable : false;
    if (retryable) await markCooldown(id, message);
    else {
      await db
        .update(aiApiKeys)
        .set({ lastErrorMessage: message, lastHealthCheck: new Date() })
        .where(eq(aiApiKeys.id, id));
    }
    return { id, alias: row.alias, ok: false, modelCount: 0, error: message };
  }
}

/* ------------------------------- execution ------------------------------- */

export interface AiRunOptions {
  prompt: string;
  system?: string;
  images?: ProviderImage[];
  maxTokens?: number;
  temperature?: number;
}

export interface AiRunResult {
  text: string;
  provider: AiProviderId;
  model: string;
  keyAlias: string;
  attempts: number;
}

type ModelPlan = { models: string[]; reason: string | null };

async function modelsFor(key: AiKeySummary): Promise<ModelPlan> {
  const rows = await db
    .select({ modelId: aiModels.modelId })
    .from(aiModels)
    .where(and(eq(aiModels.provider, key.provider), eq(aiModels.isActive, true)));

  const available = new Set(rows.map((row) => row.modelId));

  if (key.modelAllowed?.length) {
    // An explicit selection is a try-list in the tutor's own order, so it is
    // neither re-sorted nor capped — only dropped when the model is gone.
    const picked = key.modelAllowed.filter((modelId) => available.has(modelId));
    if (picked.length > 0) return { models: picked, reason: null };
    return {
      models: [],
      reason:
        available.size === 0
          ? 'belum ada model tersinkron — jalankan "Sinkronkan semua"'
          : 'model yang dipilih tidak ada lagi di katalog — perbarui pilihan atau jalankan "Sinkronkan semua"',
    };
  }

  const synced = [...available].sort();
  const candidates =
    synced.length > 0
      ? synced
      : PROVIDERS[key.provider].fallbackModels.map((model) => model.modelId);

  if (candidates.length === 0) {
    return { models: [], reason: 'belum ada model tersinkron — jalankan "Sinkronkan semua"' };
  }

  return { models: candidates.slice(0, MAX_MODELS_PER_KEY), reason: null };
}

async function routeKeys(): Promise<{ keys: AiRoutingKey[]; skippedCooldown: number }> {
  const active = await db
    .select(ROUTING_COLUMNS)
    .from(aiApiKeys)
    .where(eq(aiApiKeys.isActive, true))
    .orderBy(asc(aiApiKeys.priority), asc(aiApiKeys.id));

  const now = Date.now();
  const ready = active.filter((key) => !key.cooldownUntil || key.cooldownUntil.getTime() <= now);
  return ready.length > 0
    ? { keys: ready, skippedCooldown: active.length - ready.length }
    : { keys: active, skippedCooldown: 0 };
}

/**
 * Runs one completion against the stored key pool, failing over between models
 * and keys. Returns null when no key is configured, so callers can fall back to
 * the environment-based provider.
 */
export async function runWithStoredKeys(options: AiRunOptions): Promise<AiRunResult | null> {
  const { keys } = await routeKeys();
  if (keys.length === 0) return null;

  const errors: string[] = [];
  let attempts = 0;

  for (const key of keys) {
    const adapter = PROVIDERS[key.provider];
    const plan = await modelsFor(key);
    if (plan.models.length === 0) {
      errors.push(`${key.alias}: ${plan.reason}`);
      continue;
    }
    const models = plan.models;

    const apiKey = decryptSecret(key.apiKeyEncrypted);

    for (const model of models) {
      attempts += 1;
      try {
        const result = await adapter.call({
          apiKey,
          baseUrl: key.baseUrl,
          modelId: model,
          prompt: options.prompt,
          system: options.system,
          images: options.images,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          timeoutMs: env.ai.timeoutMs,
        });
        await markHealthy(key.id);
        return {
          text: result.text,
          provider: key.provider,
          model,
          keyAlias: key.alias,
          attempts,
        };
      } catch (error) {
        const message = trimError(error);
        errors.push(`${key.alias} · ${model}: ${message}`);
        const status = error instanceof ProviderError ? error.status : 0;
        // Rejected credentials fail for every model of this key, so skip ahead.
        const keyLevel = status === 401 || status === 403;
        if (keyLevel) {
          await markKeyError(key.id, message);
          break;
        }
        if (error instanceof ProviderError && error.retryable) {
          await markCooldown(key.id, message);
          break; // key is unhealthy — move to the next one
        }
      }
    }
  }

  throw new AiKeyError(
    errors.length > 0
      ? `Semua provider AI gagal. ${errors.slice(-3).join(" | ")}`
      : "Tidak ada model AI yang bisa dipakai.",
  );
}
