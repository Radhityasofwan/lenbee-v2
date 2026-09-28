import Anthropic from "@anthropic-ai/sdk";
import { activeAiProvider, env } from "@/lib/env";

export type CompletionRequest = {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  complete(request: CompletionRequest): Promise<string>;
}

export class AiUnavailableError extends Error {
  constructor(message = "AI provider tidak tersedia") {
    super(message);
    this.name = "AiUnavailableError";
  }
}

class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.client = new Anthropic({ apiKey, timeout: env.ai.timeoutMs, maxRetries: 2 });
  }

  async complete({ system, prompt, maxTokens, temperature }: CompletionRequest): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens ?? env.ai.maxOutputTokens,
      temperature: temperature ?? 0.6,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
  }
}

class OpenAiCompatProvider implements AiProvider {
  readonly name = "openai";
  readonly model: string;

  constructor(
    private apiKey: string,
    model: string,
    private baseUrl: string,
  ) {
    this.model = model;
  }

  async complete({ system, prompt, maxTokens, temperature }: CompletionRequest): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.ai.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens ?? env.ai.maxOutputTokens,
          temperature: temperature ?? 0.6,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new AiUnavailableError(`OpenAI error ${response.status}: ${await response.text()}`);
      }
      const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      return (json.choices?.[0]?.message?.content ?? "").trim();
    } finally {
      clearTimeout(timer);
    }
  }
}

let cached: AiProvider | null | undefined;

export function getAiProvider(): AiProvider | null {
  if (cached !== undefined) return cached;
  const kind = activeAiProvider();
  if (kind === "anthropic") {
    cached = new AnthropicProvider(env.ai.anthropicApiKey, env.ai.anthropicModel);
  } else if (kind === "openai") {
    cached = new OpenAiCompatProvider(env.ai.openaiApiKey, env.ai.openaiModel, env.ai.openaiBaseUrl);
  } else {
    cached = null;
  }
  return cached;
}

export function aiStatus(): { available: boolean; provider: string; model: string | null } {
  const provider = getAiProvider();
  return provider
    ? { available: true, provider: provider.name, model: provider.model }
    : { available: false, provider: "none", model: null };
}

/** Ekstrak objek/array JSON dari output model yang mungkin dibungkus markdown fence. */
export function extractJson<T = unknown>(raw: string): T | null {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const candidates = [cleaned];
  const firstBrace = cleaned.search(/[[{]/);
  const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }
  return null;
}
