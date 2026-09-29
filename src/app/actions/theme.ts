"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getSuperAdminOrThrow } from "@/lib/auth";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import { setThemeColor } from "@/lib/services/settings";

const themeColorSchema = z.object({
  color: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || /^#[0-9a-fA-F]{6}$/.test(v), "Format warna harus hex, mis. #7c5cd6.")
    .optional(),
});

function revalidateTheme() {
  updateTag("theme");
  revalidatePath("/", "layout");
}

export async function updateThemeColorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(themeColorSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    await getSuperAdminOrThrow();
    await setThemeColor(parsed.data.color ?? null);
  } catch (error) {
    return fail(errorMessage(error, "Gagal menyimpan warna tema."));
  }

  revalidateTheme();
  return okay(parsed.data.color ? "Warna tema diperbarui." : "Warna tema dikembalikan ke bawaan.");
}
