"use server";

import { revalidatePath } from "next/cache";
import type { AiProviderId } from "@/db/schema";
import { getTutorOrThrow } from "@/lib/auth";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import {
  AiKeyError,
  createKey,
  deleteKey,
  syncAllProviderModels,
  syncProviderModels,
  testKey,
  updateKey,
} from "@/lib/services/ai-keys";
import { aiKeyIdSchema, aiKeySchema, aiModelSyncSchema } from "@/lib/validation";

const SETTINGS_AI = "/settings/ai";

function revalidateAi() {
  revalidatePath(SETTINGS_AI);
  revalidatePath("/settings");
}

function toId(raw: unknown): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * A catalogue can only be listed with credentials that authenticate, so a failed
 * test skips the sync instead of replaying the same rejection.
 */
async function syncAfterTest(provider: AiProviderId, authenticated: boolean): Promise<string> {
  if (!authenticated) return "";
  try {
    const report = await syncProviderModels(provider);
    return report.ok
      ? ` ${report.count} model tersinkron.`
      : ` Sinkron model gagal: ${report.error ?? "tidak diketahui"}`;
  } catch {
    // best-effort — the key itself is already saved
    return "";
  }
}

export async function createAiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(aiKeySchema, formData);
  if (!parsed.success) return parsed.state;

  let createdId: number;
  try {
    await getTutorOrThrow();
    const created = await createKey({
      alias: parsed.data.alias,
      provider: parsed.data.provider,
      apiKey: parsed.data.apiKey,
      baseUrl: parsed.data.baseUrl,
      priority: parsed.data.priority,
      modelAllowed: parsed.data.modelAllowed,
    });
    createdId = created.id;
  } catch (error) {
    if (error instanceof AiKeyError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan API key."));
  }

  // A new key is verified right away so the list never shows an unproven entry.
  const test = await testKey(createdId).catch(() => null);
  const synced = await syncAfterTest(parsed.data.provider, test?.ok === true);

  revalidateAi();
  const status = test
    ? test.ok
      ? `Key aktif (${test.modelCount} model).`
      : `Key tersimpan, tapi gagal diuji: ${test.error ?? "tidak diketahui"}`
    : "Key tersimpan.";
  return okay(`${status}${synced}`);
}

export async function updateAiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(aiKeySchema, formData);
  if (!parsed.success) return parsed.state;

  const id = toId(parsed.data.id);
  if (id === null) return fail("API key tidak ditemukan.");

  let replacedSecret = false;
  try {
    await getTutorOrThrow();
    await updateKey(id, {
      alias: parsed.data.alias,
      apiKey: parsed.data.apiKey,
      baseUrl: parsed.data.baseUrl,
      priority: parsed.data.priority,
      modelAllowed: parsed.data.modelAllowed ?? null,
      ...(parsed.data.isActive === undefined ? {} : { isActive: parsed.data.isActive }),
    });
    replacedSecret = Boolean(parsed.data.apiKey?.trim());
  } catch (error) {
    if (error instanceof AiKeyError) return fail(error.message);
    return fail(errorMessage(error, "Gagal memperbarui API key."));
  }

  if (!replacedSecret) {
    revalidateAi();
    return okay("API key diperbarui.");
  }

  // A swapped secret is unproven, so prove it here rather than on the next report.
  const test = await testKey(id).catch(() => null);
  const synced = await syncAfterTest(parsed.data.provider, test?.ok === true);
  revalidateAi();

  if (!test) return okay(`API key diperbarui.${synced}`);
  if (!test.ok) {
    return okay(`API key diperbarui, tapi gagal diuji: ${test.error ?? "tidak diketahui"}`);
  }
  return okay(`API key diperbarui dan terhubung (${test.modelCount} model).${synced}`);
}

export async function toggleAiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(aiKeyIdSchema, formData);
  if (!parsed.success) return parsed.state;

  const id = toId(parsed.data.id);
  if (id === null) return fail("API key tidak ditemukan.");
  const nextActive = formData.get("isActive") === "true";

  try {
    await getTutorOrThrow();
    await updateKey(id, { isActive: nextActive });
    revalidateAi();
  } catch (error) {
    if (error instanceof AiKeyError) return fail(error.message);
    return fail(errorMessage(error, "Gagal mengubah status API key."));
  }

  return okay(nextActive ? "API key diaktifkan." : "API key dinonaktifkan.");
}

export async function deleteAiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(aiKeyIdSchema, formData);
  if (!parsed.success) return parsed.state;

  const id = toId(parsed.data.id);
  if (id === null) return fail("API key tidak ditemukan.");

  try {
    await getTutorOrThrow();
    await deleteKey(id);
    revalidateAi();
  } catch (error) {
    if (error instanceof AiKeyError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus API key."));
  }

  return okay("API key dihapus.");
}

export async function testAiKeyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(aiKeyIdSchema, formData);
  if (!parsed.success) return parsed.state;

  const id = toId(parsed.data.id);
  if (id === null) return fail("API key tidak ditemukan.");

  try {
    await getTutorOrThrow();
    const result = await testKey(id);
    revalidateAi();
    if (!result.ok) return fail(`Koneksi gagal: ${result.error ?? "tidak diketahui"}`);
    return okay(`${result.alias} terhubung. ${result.modelCount} model tersedia${result.sample ? ` — ${result.sample}` : ""}.`);
  } catch (error) {
    if (error instanceof AiKeyError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menguji API key."));
  }
}

export async function syncAiModelsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(aiModelSyncSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    await getTutorOrThrow();
    if (parsed.data.provider) {
      const report = await syncProviderModels(parsed.data.provider);
      revalidateAi();
      if (!report.ok) return fail(report.error ?? "Sinkronisasi model gagal.");
      return okay(`${report.count} model ${parsed.data.provider} tersinkron.`);
    }

    const reports = await syncAllProviderModels();
    revalidateAi();
    const okReports = reports.filter((report) => report.ok);
    const failed = reports.filter((report) => !report.ok);
    if (okReports.length === 0) {
      return fail(reports.map((report) => report.error).filter(Boolean).join(" | ") || "Sinkronisasi model gagal.");
    }
    const succeeded = okReports.map((report) => `${report.provider}: ${report.count} model`).join(", ");
    const failures = failed.map((report) => `${report.provider}: ${report.error ?? "gagal"}`).join(" | ");
    return okay(`${succeeded}.${failures ? ` Gagal — ${failures}` : ""}`);
  } catch (error) {
    if (error instanceof AiKeyError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyinkronkan model."));
  }
}
