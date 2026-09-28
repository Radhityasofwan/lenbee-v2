"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getSessionUserOrThrow } from "@/lib/auth";
import { env } from "@/lib/env";
import { errorMessage, fail, okay, type ActionState } from "@/lib/form";
import { buildStorageKey, getStorage, looksLikeDeclaredType } from "@/lib/storage";
import { markAllRead, markRead } from "@/lib/services/notifications";

function readAvatar(formData: FormData): File | null {
  const value = formData.get("avatar");
  return value instanceof File && value.size > 0 ? value : null;
}

export async function updateAvatarAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const file = readAvatar(formData);
  if (!file) return fail("Pilih gambar yang ingin dipakai.", { avatar: "Gambar wajib dipilih." });

  const mimeType = (file.type || "").toLowerCase();
  if (!mimeType.startsWith("image/")) {
    return fail("Foto profil harus berupa gambar.", { avatar: "Format gambar tidak didukung." });
  }
  if (file.size > env.uploads.maxFileSizeBytes) {
    const max = Math.round(env.uploads.maxFileSizeBytes / (1024 * 1024));
    return fail(`Ukuran gambar maksimal ${max} MB.`, { avatar: `Maksimal ${max} MB.` });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!looksLikeDeclaredType(buffer, mimeType)) {
    return fail("Isi berkas tidak cocok dengan tipe yang dinyatakan.", { avatar: "Berkas tidak valid." });
  }

  try {
    const session = await getSessionUserOrThrow();
    const previous = session.avatarPath;
    const key = buildStorageKey(`avatars/${session.id}`, file.name, mimeType);

    await getStorage().put(key, buffer);
    await db.update(users).set({ avatarPath: key }).where(eq(users.id, session.id));
    if (previous) await getStorage().delete(previous).catch(() => {});
  } catch (error) {
    return fail(errorMessage(error, "Gagal memperbarui foto profil."));
  }

  revalidatePath("/settings");
  revalidatePath("/home");
  revalidatePath("/parent");
  return okay("Foto profil diperbarui.");
}

export async function removeAvatarAction(): Promise<ActionState> {
  try {
    const session = await getSessionUserOrThrow();
    if (session.avatarPath) {
      await getStorage().delete(session.avatarPath).catch(() => {});
      await db.update(users).set({ avatarPath: null }).where(eq(users.id, session.id));
    }
  } catch (error) {
    return fail(errorMessage(error, "Gagal menghapus foto profil."));
  }

  revalidatePath("/settings");
  revalidatePath("/home");
  revalidatePath("/parent");
  return okay("Foto profil dihapus.");
}

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  try {
    const session = await getSessionUserOrThrow();
    await markAllRead(session.id);
  } catch (error) {
    return fail(errorMessage(error, "Gagal menandai notifikasi."));
  }

  revalidatePath("/notifications");
  revalidatePath("/home");
  return okay("Semua notifikasi ditandai sudah dibaca.");
}

export async function markNotificationReadAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("notificationId"));
  if (!Number.isInteger(id)) return fail("Notifikasi tidak ditemukan.");

  try {
    const session = await getSessionUserOrThrow();
    await markRead(session.id, id);
  } catch (error) {
    return fail(errorMessage(error, "Gagal menandai notifikasi."));
  }

  revalidatePath("/notifications");
  revalidatePath("/home");
  return okay("Ditandai sudah dibaca.");
}
