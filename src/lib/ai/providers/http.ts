import { ProviderError } from "@/lib/ai/providers/types";

/** OpenAI-style bodies carry `error.message`; some gateways (9Router) send `error` as a plain string. */
function extractMessage(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    const candidates = [parsed.error, asRecord(parsed.error)?.message, parsed.message];
    const value = candidates.find((item) => typeof item === "string" && item.trim());
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function requestJson(url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    const raw = await response.text();

    if (!response.ok) {
      const detail = extractMessage(raw);
      throw new ProviderError(`HTTP ${response.status}${detail ? `: ${detail}` : ""}`, {
        status: response.status,
        retryable: response.status === 429 || response.status >= 500,
      });
    }

    if (!raw.trim()) return null;

    try {
      return JSON.parse(raw) as unknown;
    } catch {
      throw new ProviderError("Respons provider bukan JSON yang valid.");
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderError("Permintaan ke provider melewati batas waktu.", { retryable: true });
    }
    throw new ProviderError(error instanceof Error ? error.message : "Gagal menghubungi provider.", {
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}
