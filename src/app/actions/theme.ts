"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { getSuperAdminOrThrow } from "@/lib/auth";
import { isValidHex } from "@/lib/domain/theme";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import { setThemeConfig } from "@/lib/services/settings";

const hexOrEmpty = (label: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || isValidHex(v), `${label} harus hex 6 digit, mis. #7c5cd6.`);

const themeConfigSchema = z
  .object({
    primary: hexOrEmpty("Warna primary"),
    gradient: z.string().optional(),
    secondary: hexOrEmpty("Warna kedua"),
  })
  .transform((data) => ({
    primary: data.primary,
    gradient: data.gradient === "on",
    secondary: data.secondary === "" ? null : data.secondary,
  }));

function revalidateTheme() {
  updateTag("theme");
  revalidatePath("/", "layout");
}

export async function updateThemeColorAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(themeConfigSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    await getSuperAdminOrThrow();
    if (parsed.data.primary === "") {
      await setThemeConfig(null);
    } else {
      await setThemeConfig({
        primary: parsed.data.primary,
        gradient: parsed.data.gradient,
        secondary: parsed.data.secondary,
      });
    }
  } catch (error) {
    return fail(errorMessage(error, "Gagal menyimpan tema."));
  }

  revalidateTheme();
  return okay(parsed.data.primary ? "Tema diperbarui." : "Tema dikembalikan ke bawaan.");
}
