"use server";

import { revalidatePath } from "next/cache";
import { generateQuestionVariants } from "@/lib/ai";
import { getTutorOrThrow } from "@/lib/auth";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import {
  BankQuestionError,
  createBankQuestions,
  deleteBankQuestion,
  getOwnedBankQuestion,
  incrementBankUsage,
  listBankQuestions,
} from "@/lib/services/question-bank";
import { bankQuestionIdSchema, bankQuestionSearchSchema, bankVariantSchema, saveToBankSchema } from "@/lib/validation";

function revalidateBank() {
  revalidatePath("/bank-soal");
}

export async function saveToBankAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(saveToBankSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    const count = await createBankQuestions(
      tutor.id,
      {
        subject: parsed.data.subject,
        grade: parsed.data.grade,
        material: parsed.data.material,
        difficulty: parsed.data.difficulty,
      },
      parsed.data.questions.map((q) => ({
        type: q.type,
        prompt: q.prompt,
        options: q.type === "multiple_choice" ? (q.options ?? []).filter((o) => o.trim().length > 0) : undefined,
        correctAnswer: q.correctAnswer ?? null,
        points: q.points,
        explanation: q.explanation ?? null,
      })),
    );
    revalidateBank();
    return okay(`${count} soal disimpan ke Bank Soal.`);
  } catch (error) {
    if (error instanceof BankQuestionError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan ke Bank Soal."));
  }
}

export async function searchBankQuestionsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(bankQuestionSearchSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    const results = await listBankQuestions(tutor.id, parsed.data);
    return okay(
      results.length > 0 ? `${results.length} soal ditemukan.` : "Tidak ada soal yang cocok.",
      { results },
    );
  } catch (error) {
    return fail(errorMessage(error, "Gagal mencari soal."));
  }
}

export async function deleteBankQuestionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(bankQuestionIdSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    await deleteBankQuestion(tutor.id, Number(parsed.data.id));
    revalidateBank();
  } catch (error) {
    if (error instanceof BankQuestionError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus soal."));
  }

  return okay("Soal dihapus dari Bank Soal.");
}

/** Buat N variasi baru dari satu soal acuan, langsung tersimpan ke Bank Soal. */
export async function generateBankVariantAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(bankVariantSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    const base = await getOwnedBankQuestion(tutor.id, Number(parsed.data.id));

    const result = await generateQuestionVariants(tutor.id, {
      subject: base.subject,
      material: base.material,
      count: parsed.data.count,
      base: {
        type: base.type,
        prompt: base.prompt,
        options: base.options ?? undefined,
        correctAnswer: base.correctAnswer ?? undefined,
        points: base.points,
        explanation: base.explanation ?? undefined,
      },
    });

    if (result.questions.length === 0) {
      return fail("AI belum bisa membuat variasi saat ini. Coba lagi.");
    }

    const count = await createBankQuestions(
      tutor.id,
      { subject: base.subject, grade: base.grade, material: base.material, difficulty: base.difficulty },
      result.questions.map((q) => ({
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correctAnswer ?? null,
        points: q.points,
        explanation: q.explanation ?? null,
      })),
    );
    revalidateBank();
    return okay(`${count} variasi baru ditambahkan${result.usedAi ? " oleh AI" : ""}.`);
  } catch (error) {
    if (error instanceof BankQuestionError) return fail(error.message);
    return fail(errorMessage(error, "Gagal membuat variasi soal."));
  }
}

/** Dipanggil langsung (bukan lewat form) saat soal bank dipakai di tugas — best-effort, tidak menghentikan alur. */
export async function markBankQuestionsUsedAction(ids: number[]): Promise<void> {
  try {
    const tutor = await getTutorOrThrow();
    await incrementBankUsage(tutor.id, ids);
  } catch {
    // statistik pemakaian tidak boleh menggagalkan alur menambah soal ke tugas
  }
}
