export type AIProviderId = "9router" | "google" | "openrouter";

export interface ProviderModel {
  modelId: string;
  name: string;
}

export interface ProviderImage {
  mimeType: string;
  base64: string;
}

export interface ProviderCallOptions {
  apiKey: string;
  baseUrl?: string | null;
  modelId: string;
  prompt: string;
  system?: string;
  images?: ProviderImage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs: number;
}

export interface ProviderCallResult {
  text: string;
  tokensUsed?: number;
}

export interface ProviderAdapter {
  readonly id: AIProviderId;
  readonly label: string;
  readonly defaultBaseUrl: string;
  /** Used only while the model table has no synced rows for this provider. */
  readonly fallbackModels: ProviderModel[];
  listModels(input: { apiKey: string; baseUrl?: string | null; timeoutMs: number }): Promise<ProviderModel[]>;
  call(options: ProviderCallOptions): Promise<ProviderCallResult>;
}

export class ProviderError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, options: { status?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = "ProviderError";
    this.status = options.status ?? 0;
    this.retryable = options.retryable ?? false;
  }
}

export function baseUrlOf(adapter: ProviderAdapter, override?: string | null): string {
  const value = override?.trim() || adapter.defaultBaseUrl;
  return value.replace(/\/+$/, "");
}
