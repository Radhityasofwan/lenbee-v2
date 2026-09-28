import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AiKeysManager, type KeyRowData, type ModelOption, type ProviderId } from "./ai-keys-manager";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { PROVIDER_IDS, PROVIDERS } from "@/lib/ai/providers";
import { requireUser } from "@/lib/auth";
import { listKeys, listModels } from "@/lib/services/ai-keys";

export const metadata: Metadata = { title: "AI & Model" };

export default async function AiSettingsPage() {
  const session = await requireUser();
  if (session.role !== "tutor") notFound();

  const [keys, models] = await Promise.all([listKeys(), listModels()]);

  const providers = PROVIDER_IDS.map((id) => ({
    id: id as ProviderId,
    label: PROVIDERS[id].label,
    defaultBaseUrl: PROVIDERS[id].defaultBaseUrl,
  }));

  const keyRows: KeyRowData[] = keys.map((key) => ({
    id: key.id,
    alias: key.alias,
    provider: key.provider as ProviderId,
    keyHint: key.keyHint,
    baseUrl: key.baseUrl,
    modelAllowed: key.modelAllowed,
    priority: key.priority,
    isActive: key.isActive,
    healthStatus: key.healthStatus,
    cooldownUntil: key.cooldownUntil,
    lastErrorMessage: key.lastErrorMessage,
  }));

  const modelOptions: ModelOption[] = models.map((model) => ({
    provider: model.provider as ProviderId,
    modelId: model.modelId,
    name: model.name,
    isActive: model.isActive,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground">
        <Link href="/settings">
          <ArrowLeft />
          Pengaturan
        </Link>
      </Button>

      <PageHeader
        title="AI & Model"
        description="Kelola kumpulan API key yang dipakai untuk membuat report, rangkuman, dan soal latihan."
      />

      <AiKeysManager keys={keyRows} models={modelOptions} providers={providers} />
    </div>
  );
}
