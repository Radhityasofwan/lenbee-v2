import { createOpenAiCompatAdapter } from "@/lib/ai/providers/openai-compat";

/**
 * 9Router gateway (ai.matik.id). Its /v1/models endpoint requires the key —
 * without one it answers 401 "API key required for remote API access" — so the
 * catalogue is discovered at sync time instead of being hard-coded here.
 */
export const ninerouterAdapter = createOpenAiCompatAdapter({
  id: "9router",
  label: "9Router",
  defaultBaseUrl: "https://ai.matik.id/v1",
  modelsRequireKey: true,
  fallbackModels: [],
});
