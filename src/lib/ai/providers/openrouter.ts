import { createOpenAiCompatAdapter } from "@/lib/ai/providers/openai-compat";

export const openrouterAdapter = createOpenAiCompatAdapter({
  id: "openrouter",
  label: "OpenRouter",
  defaultBaseUrl: "https://openrouter.ai/api/v1",
  extraHeaders: { "HTTP-Referer": "https://lenbee.app", "X-Title": "Lenbee" },
  fallbackModels: [
    { modelId: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { modelId: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
  ],
});
