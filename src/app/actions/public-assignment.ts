"use server";

import { revalidatePath } from "next/cache";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import {
  AssignmentError,
  startAttemptByToken,
  submitAttemptByToken,
} from "@/lib/services/assignments";
import { publicAssignmentTokenSchema, publicAttemptSubmitSchema } from "@/lib/validation";

/** Tanpa sesi tutor — token di link itu sendiri yang jadi kredensial akses. */
export async function startAttemptByTokenAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(publicAssignmentTokenSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const attempt = await startAttemptByToken(parsed.data.token);
    return okay("Pengerjaan dimulai.", { attemptId: attempt.id });
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal memulai pengerjaan."));
  }
}

export async function submitAttemptByTokenAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(publicAttemptSubmitSchema, formData);
  if (!parsed.success) return parsed.state;

  const answers = parsed.data.answers.map((item) => ({
    questionId: Number(item.questionId),
    answer: item.answer,
  }));

  try {
    const result = await submitAttemptByToken(parsed.data.token, Number(parsed.data.attemptId), answers);
    revalidatePath(`/share/assignment/${parsed.data.token}`);

    if (result.needsManualReview) {
      return okay("Jawaban terkirim. Soal uraian akan dinilai oleh tutor.", result);
    }
    return okay(`Selesai! Nilai kamu ${result.score} dari ${result.maxScore}.`, result);
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal mengirim jawaban."));
  }
}
