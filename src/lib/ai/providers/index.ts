import { googleAdapter } from "@/lib/ai/providers/google";
import { ninerouterAdapter } from "@/lib/ai/providers/ninerouter";
import { openrouterAdapter } from "@/lib/ai/providers/openrouter";
import type { AIProviderId, ProviderAdapter } from "@/lib/ai/providers/types";

/** Key order drives the provider select and the sync buttons, so 9Router leads. */
export const PROVIDERS: Record<AIProviderId, ProviderAdapter> = {
  "9router": ninerouterAdapter,
  google: googleAdapter,
  openrouter: openrouterAdapter,
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as AIProviderId[];

export function providerLabel(id: AIProviderId): string {
  return PROVIDERS[id]?.label ?? id;
}

export type {
  AIProviderId,
  ProviderAdapter,
  ProviderCallOptions,
  ProviderCallResult,
  ProviderImage,
  ProviderModel,
} from "@/lib/ai/providers/types";
export { ProviderError } from "@/lib/ai/providers/types";
