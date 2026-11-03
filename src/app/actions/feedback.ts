"use server";

import { revalidatePath } from "next/cache";
import { getSessionUserOrThrow, getSuperAdminOrThrow } from "@/lib/auth";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import { setFeedbackStatus, submitFeedback } from "@/lib/services/feedback";
import { appFeedbackSchema } from "@/lib/validation";

export async function submitFeedbackAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(appFeedbackSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const session = await getSessionUserOrThrow();
    await submitFeedback(session.id, parsed.data.message);
  } catch (error) {
    return fail(errorMessage(error, "Gagal mengirim masukan."));
  }

  revalidatePath("/admin/feedback");
  return okay("Terima kasih atas masukannya!");
}

export async function setFeedbackStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const status = formData.get("status") === "reviewed" ? "reviewed" : "new";
  if (!Number.isInteger(id) || id <= 0) return fail("Masukan tidak ditemukan.");

  try {
    await getSuperAdminOrThrow();
    await setFeedbackStatus(id, status);
  } catch (error) {
    return fail(errorMessage(error, "Gagal memperbarui status."));
  }

  revalidatePath("/admin/feedback");
  return okay(status === "reviewed" ? "Ditandai sudah ditinjau." : "Ditandai belum ditinjau.");
}
