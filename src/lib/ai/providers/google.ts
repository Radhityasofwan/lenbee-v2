import { asArray, asRecord, asText, requestJson } from "@/lib/ai/providers/http";
import {
  ProviderError,
  type ProviderAdapter,
  type ProviderCallOptions,
  type ProviderCallResult,
  type ProviderModel,
} from "@/lib/ai/providers/types";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function headers(apiKey: string): Record<string, string> {
  return { "content-type": "application/json", "x-goog-api-key": apiKey };
}

export const googleAdapter: ProviderAdapter = {
  id: "google",
  label: "Google Gemini",
  defaultBaseUrl: DEFAULT_BASE_URL,
  fallbackModels: [
    { modelId: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { modelId: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  ],

  async listModels({ apiKey, baseUrl, timeoutMs }): Promise<ProviderModel[]> {
    const root = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const payload = await requestJson(
      `${root}/models?pageSize=200`,
      { method: "GET", headers: headers(apiKey) },
      timeoutMs,
    );

    const models = asArray(asRecord(payload)?.models)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => entry !== null)
      .filter((entry) => asArray(entry.supportedGenerationMethods).includes("generateContent"))
      .map((entry) => {
        const modelId = asText(entry.name).replace(/^models\//, "");
        return { modelId, name: asText(entry.displayName) || modelId };
      })
      .filter((model) => model.modelId.length > 0);

    if (models.length === 0) {
      throw new ProviderError("Provider tidak mengembalikan model yang bisa dipakai generateContent.");
    }
    return models;
  },

  async call(options: ProviderCallOptions): Promise<ProviderCallResult> {
    const { apiKey, modelId, prompt, system, images, temperature, maxTokens, timeoutMs } = options;
    const root = (options.baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");

    const parts: Record<string, unknown>[] = [];
    for (const image of images ?? []) {
      parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
    }
    parts.push({ text: prompt });

    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        ...(typeof temperature === "number" ? { temperature } : {}),
        ...(typeof maxTokens === "number" ? { maxOutputTokens: maxTokens } : {}),
      },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };

    const payload = await requestJson(
      `${root}/models/${encodeURIComponent(modelId)}:generateContent`,
      { method: "POST", headers: headers(apiKey), body: JSON.stringify(body) },
      timeoutMs,
    );

    const record = asRecord(payload);
    const candidate = asRecord(asArray(record?.candidates)[0]);
    const text = asArray(asRecord(candidate?.content)?.parts)
      .map((part) => asText(asRecord(part)?.text))
      .join("")
      .trim();

    if (!text) {
      const reason = asText(candidate?.finishReason);
      throw new ProviderError(
        reason ? `Provider tidak mengembalikan teks (finishReason: ${reason}).` : "Provider tidak mengembalikan teks.",
      );
    }

    const tokensUsed = asRecord(record?.usageMetadata)?.totalTokenCount;
    return { text, tokensUsed: typeof tokensUsed === "number" ? tokensUsed : undefined };
  },
};
