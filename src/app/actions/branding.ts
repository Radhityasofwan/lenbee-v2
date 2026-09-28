"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getTutorOrThrow } from "@/lib/auth";
import { env } from "@/lib/env";
import { errorMessage, fail, okay, type ActionState } from "@/lib/form";
import { getBrandingAsset, setBrandingAsset, type BrandingSlot } from "@/lib/services/settings";
import { buildStorageKey, getStorage, looksLikeDeclaredType } from "@/lib/storage";

const LABELS: Record<BrandingSlot, string> = {
  logo: "Logo",
  favicon: "Favicon",
  pwaIcon: "Ikon PWA",
};

function readFile(formData: FormData, field: string): File | null {
  const value = formData.get(field);
  return value instanceof File && value.size > 0 ? value : null;
}

function revalidateBranding() {
  updateTag("branding");
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  revalidatePath("/manifest.webmanifest");
}

async function uploadBranding(slot: BrandingSlot, formData: FormData): Promise<ActionState> {
  const label = LABELS[slot];
  const file = readFile(formData, slot);
  if (!file) return fail(`Pilih gambar ${label.toLowerCase()}.`, { [slot]: "Gambar wajib dipilih." });

  const mimeType = (file.type || "").toLowerCase();
  if (!mimeType.startsWith("image/")) {
    return fail(`${label} harus berupa gambar.`, { [slot]: "Format gambar tidak didukung." });
  }
  if (file.size > env.uploads.maxFileSizeBytes) {
    const max = Math.round(env.uploads.maxFileSizeBytes / (1024 * 1024));
    return fail(`Ukuran gambar maksimal ${max} MB.`, { [slot]: `Maksimal ${max} MB.` });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeDeclaredType(buffer, mimeType)) {
    return fail("Isi berkas tidak cocok dengan tipe yang dinyatakan.", { [slot]: "Berkas tidak valid." });
  }

  try {
    await getTutorOrThrow();
    const previous = await getBrandingAsset(slot);
    const key = buildStorageKey(`branding/${slot}`, file.name, mimeType);

    await getStorage().put(key, buffer);
    await setBrandingAsset(slot, { key, mimeType, originalName: file.name });
    if (previous) await getStorage().delete(previous.key).catch(() => {});
  } catch (error) {
    return fail(errorMessage(error, `Gagal memperbarui ${label.toLowerCase()}.`));
  }

  revalidateBranding();
  return okay(`${label} diperbarui.`);
}

export async function updateLogoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return uploadBranding("logo", formData);
}

export async function updateFaviconAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return uploadBranding("favicon", formData);
}

export async function updatePwaIconAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return uploadBranding("pwaIcon", formData);
}

export async function removeBrandingAssetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slot = formData.get("slot");
  if (slot !== "logo" && slot !== "favicon" && slot !== "pwaIcon") return fail("Aset tidak dikenali.");

  try {
    await getTutorOrThrow();
    const previous = await getBrandingAsset(slot);
    if (previous) {
      await getStorage().delete(previous.key).catch(() => {});
      await setBrandingAsset(slot, null);
    }
  } catch (error) {
    return fail(errorMessage(error, `Gagal menghapus ${LABELS[slot].toLowerCase()}.`));
  }

  revalidateBranding();
  return okay(`${LABELS[slot]} dihapus, kembali ke bawaan.`);
}
