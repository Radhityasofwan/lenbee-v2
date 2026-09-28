import { asArray, asRecord, asText, requestJson } from "@/lib/ai/providers/http";
import {
  ProviderError,
  type AIProviderId,
  type ProviderAdapter,
  type ProviderCallOptions,
  type ProviderCallResult,
  type ProviderModel,
} from "@/lib/ai/providers/types";

export interface OpenAiCompatConfig {
  id: AIProviderId;
  label: string;
  defaultBaseUrl: string;
  fallbackModels: ProviderModel[];
  extraHeaders?: Record<string, string>;
  /** Some gateways expose the catalogue only to an authenticated caller. */
  modelsRequireKey?: boolean;
}

/** Shared implementation for providers speaking the OpenAI chat-completions dialect. */
export function createOpenAiCompatAdapter(config: OpenAiCompatConfig): ProviderAdapter {
  const rootOf = (baseUrl?: string | null) => (baseUrl?.trim() || config.defaultBaseUrl).replace(/\/+$/, "");
  const headersOf = (apiKey: string) => ({
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
    ...config.extraHeaders,
  });

  return {
    id: config.id,
    label: config.label,
    defaultBaseUrl: config.defaultBaseUrl,
    fallbackModels: config.fallbackModels,

    async listModels({ apiKey, baseUrl, timeoutMs }): Promise<ProviderModel[]> {
      const payload = await requestJson(
        `${rootOf(baseUrl)}/models`,
        config.modelsRequireKey ? { method: "GET", headers: headersOf(apiKey) } : { method: "GET" },
        timeoutMs,
      );

      const models = asArray(asRecord(payload)?.data ?? payload)
        .map((entry) => asRecord(entry))
        .filter((entry): entry is Record<string, unknown> => entry !== null)
        .map((entry) => ({ modelId: asText(entry.id), name: asText(entry.name) || asText(entry.id) }))
        .filter((model) => model.modelId.length > 0);

      if (models.length === 0) {
        throw new ProviderError(`${config.label} tidak mengembalikan daftar model.`);
      }
      return models;
    },

    async call(options: ProviderCallOptions): Promise<ProviderCallResult> {
      const { apiKey, modelId, prompt, system, images, temperature, maxTokens, timeoutMs } = options;

      const userContent = images?.length
        ? [
            { type: "text", text: prompt },
            ...images.map((image) => ({
              type: "image_url",
              image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
            })),
          ]
        : prompt;

      const messages: Record<string, unknown>[] = [];
      if (system) messages.push({ role: "system", content: system });
      messages.push({ role: "user", content: userContent });

      const payload = await requestJson(
        `${rootOf(options.baseUrl)}/chat/completions`,
        {
          method: "POST",
          headers: headersOf(apiKey),
          body: JSON.stringify({
            model: modelId,
            messages,
            ...(typeof temperature === "number" ? { temperature } : {}),
            ...(typeof maxTokens === "number" ? { max_tokens: maxTokens } : {}),
          }),
        },
        timeoutMs,
      );

      const record = asRecord(payload);
      const choice = asRecord(asArray(record?.choices)[0]);
      const message = asRecord(choice?.message);
      const text = (asText(message?.content) || asText(choice?.text)).trim();

      if (!text) {
        const reason = asText(choice?.finish_reason);
        throw new ProviderError(
          reason
            ? `Provider tidak mengembalikan teks (finish_reason: ${reason}).`
            : "Provider tidak mengembalikan teks.",
        );
      }

      const usage = asRecord(record?.usage);
      const tokensUsed = usage?.total_tokens;
      return { text, tokensUsed: typeof tokensUsed === "number" ? tokensUsed : undefined };
    },
  };
}
