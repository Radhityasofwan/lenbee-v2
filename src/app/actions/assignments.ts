"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { programs, students } from "@/db/schema";
import { getTutorOrThrow } from "@/lib/auth";
import { generateQuestions } from "@/lib/ai";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import { documentAsAiAttachment } from "@/lib/services/documents";
import {
  AssignmentError,
  createAssignment,
  deleteAssignment,
  getOwnedAssignment,
  getOwnedAttempt,
  gradeAttemptManually,
  questionsForAssignment,
  replaceQuestions,
  setAssignmentStatus,
  startAttempt,
  submitAttempt,
  updateAssignment,
  weakMaterialsForStudent,
  type QuestionInput,
} from "@/lib/services/assignments";
import { formatDateShort, todayKey } from "@/lib/datetime";
import {
  attemptGradeSchema,
  attemptSubmitSchema,
  assignmentQuestionsSchema,
  assignmentSchema,
  aiAssignmentSchema,
  generatePracticeSchema,
} from "@/lib/validation";

function revalidateAssignments(studentId?: number, assignmentId?: number) {
  revalidatePath("/assignments");
  revalidatePath("/home");
  if (studentId) revalidatePath(`/students/${studentId}`);
  if (assignmentId) {
    revalidatePath(`/assignments/${assignmentId}`);
    revalidatePath(`/assignments/${assignmentId}/edit`);
  }
}

function asQuestionInputs(rows: {
  type: "multiple_choice" | "short_answer" | "essay";
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  explanation?: string;
}[]): QuestionInput[] {
  return rows.map((row) => ({
    type: row.type,
    prompt: row.prompt,
    options: row.type === "multiple_choice" ? (row.options ?? []).filter((o) => o.trim().length > 0) : undefined,
    correctAnswer: row.correctAnswer ?? null,
    points: row.points,
    explanation: row.explanation ?? null,
  }));
}

export async function createAssignmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(assignmentSchema, formData);
  if (!parsed.success) return parsed.state;

  let createdId: number | null = null;
  try {
    const tutor = await getTutorOrThrow();
    const created = await createAssignment(tutor.id, {
      studentId: Number(parsed.data.studentId),
      programId: parsed.data.programId ? Number(parsed.data.programId) : null,
      title: parsed.data.title,
      material: parsed.data.material ?? null,
      instructions: parsed.data.instructions ?? null,
      difficulty: parsed.data.difficulty,
      status: parsed.data.status,
    });
    createdId = created.id;
    revalidateAssignments(created.studentId, created.id);
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan tugas."));
  }

  redirect(`/assignments/${createdId}`);
}

export async function updateAssignmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(assignmentSchema, formData);
  if (!parsed.success) return parsed.state;

  const assignmentIdRaw = formData.get("assignmentId");
  const assignmentId = Number(typeof assignmentIdRaw === "string" ? assignmentIdRaw : NaN);
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) return fail("Tugas tidak ditemukan.");

  let studentId: number | null = null;
  try {
    const tutor = await getTutorOrThrow();
    await updateAssignment(tutor.id, assignmentId, {
      programId: parsed.data.programId ? Number(parsed.data.programId) : null,
      title: parsed.data.title,
      material: parsed.data.material ?? null,
      instructions: parsed.data.instructions ?? null,
      difficulty: parsed.data.difficulty,
      status: parsed.data.status,
    });
    studentId = Number(parsed.data.studentId);
    revalidateAssignments(studentId, assignmentId);
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal memperbarui tugas."));
  }

  redirect(`/assignments/${assignmentId}`);
}

export async function setAssignmentStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const assignmentId = Number(formData.get("assignmentId"));
  const statusRaw = String(formData.get("status") ?? "");
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) return fail("Tugas tidak ditemukan.");
  if (statusRaw !== "draft" && statusRaw !== "published" && statusRaw !== "archived") return fail("Status tidak dikenal.");

  try {
    const tutor = await getTutorOrThrow();
    await setAssignmentStatus(tutor.id, assignmentId, statusRaw);
    revalidateAssignments(undefined, assignmentId);
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal mengubah status tugas."));
  }

  return okay(statusRaw === "published" ? "Tugas diterbitkan." : statusRaw === "archived" ? "Tugas diarsipkan." : "Tugas dikembalikan ke draf.");
}

export async function deleteAssignmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const assignmentId = Number(formData.get("assignmentId"));
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) return fail("Tugas tidak ditemukan.");

  try {
    const tutor = await getTutorOrThrow();
    await deleteAssignment(tutor.id, assignmentId);
    revalidateAssignments();
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus tugas."));
  }

  redirect("/assignments");
}

export async function saveQuestionsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(assignmentQuestionsSchema, formData);
  if (!parsed.success) return parsed.state;

  const assignmentId = Number(parsed.data.assignmentId);
  const questions = asQuestionInputs(parsed.data.questions);

  const missingOptions = questions.findIndex((q) => q.type === "multiple_choice" && (q.options?.length ?? 0) < 2);
  if (missingOptions >= 0) {
    return fail(`Soal ${missingOptions + 1}: pilihan ganda butuh minimal 2 opsi jawaban.`);
  }

  try {
    const tutor = await getTutorOrThrow();
    await replaceQuestions(tutor.id, assignmentId, questions, formData.get("aiGenerated") === "true");
    revalidateAssignments(undefined, assignmentId);
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan soal."));
  }

  return okay(`${questions.length} soal disimpan.`);
}

export async function generateQuestionsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(aiAssignmentSchema, formData);
  if (!parsed.success) return parsed.state;

  try {
    const tutor = await getTutorOrThrow();
    const studentId = Number(parsed.data.studentId);

    const rows = await db
      .select({
        name: students.name,
        nickname: students.nickname,
        grade: students.grade,
        programName: programs.name,
      })
      .from(students)
      .leftJoin(programs, and(eq(programs.studentId, students.id), eq(programs.isActive, true)))
      .where(and(eq(students.id, studentId), eq(students.tutorId, tutor.id)))
      .limit(1);

    const student = rows[0];
    if (!student) return fail("Murid tidak ditemukan.");

    const images = parsed.data.documentId
      ? [await documentAsAiAttachment(tutor.id, Number(parsed.data.documentId))]
      : undefined;

    const result = await generateQuestions(tutor.id, {
      studentName: student.nickname || student.name,
      level: student.grade ?? "",
      programName: student.programName ?? parsed.data.subject,
      material: parsed.data.topic,
      count: parsed.data.count,
      types: ["multiple_choice", "short_answer"],
      difficulty: parsed.data.difficulty,
      extraInstructions: parsed.data.subject ? `Mata pelajaran: ${parsed.data.subject}.` : null,
      images,
    });

    if (result.questions.length === 0) {
      return fail("AI belum bisa membuat soal saat ini. Coba lagi atau tulis soal manual.");
    }

    return okay(`${result.questions.length} soal dibuat${result.usedAi ? " oleh AI" : ""}.`, {
      questions: result.questions,
      usedAi: result.usedAi,
    });
  } catch (error) {
    return fail(errorMessage(error, "Gagal membuat soal."));
  }
}

export async function startAttemptAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const assignmentId = Number(formData.get("assignmentId"));
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) return fail("Tugas tidak ditemukan.");

  try {
    const tutor = await getTutorOrThrow();
    const assignment = await getOwnedAssignment(tutor.id, assignmentId);
    const existing = await questionsForAssignment(assignment.id);
    if (existing.length === 0) return fail("Tambahkan soal terlebih dahulu sebelum mulai mengerjakan.");

    await startAttempt(tutor.id, assignmentId);
    revalidateAssignments(assignment.studentId, assignmentId);
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal memulai pengerjaan."));
  }

  return okay("Pengerjaan dimulai.");
}

export async function submitAttemptAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(attemptSubmitSchema, formData);
  if (!parsed.success) return parsed.state;

  const attemptId = Number(parsed.data.attemptId);
  const answers = parsed.data.answers.map((item) => ({
    questionId: Number(item.questionId),
    answer: item.answer,
  }));

  try {
    const tutor = await getTutorOrThrow();
    const { assignment } = await getOwnedAttemptRow(tutor.id, attemptId);
    const result = await submitAttempt(tutor.id, attemptId, answers);
    revalidateAssignments(assignment.studentId, assignment.id);

    if (result.needsManualReview) {
      return okay("Jawaban tersimpan. Soal uraian masih perlu dinilai manual.");
    }
    return okay(`Selesai dinilai: ${result.score} dari ${result.maxScore}.`);
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan jawaban."));
  }
}

export async function gradeAttemptAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(attemptGradeSchema, formData);
  if (!parsed.success) return parsed.state;

  const attemptId = Number(parsed.data.attemptId);
  const grades = parsed.data.answers.map((item) => ({
    questionId: Number(item.questionId),
    isCorrect: item.isCorrect,
    pointsAwarded: item.pointsAwarded,
    feedback: item.feedback ?? null,
  }));

  try {
    const tutor = await getTutorOrThrow();
    const { assignment } = await getOwnedAttemptRow(tutor.id, attemptId);
    await gradeAttemptManually(tutor.id, attemptId, grades);
    revalidateAssignments(assignment.studentId, assignment.id);
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menyimpan penilaian."));
  }

  return okay("Penilaian tersimpan.");
}

async function getOwnedAttemptRow(tutorId: number, attemptId: number) {
  return getOwnedAttempt(tutorId, attemptId);
}

/** Buat draf tugas latihan dari materi yang paling sering salah — tutor tetap meninjau sebelum diterbitkan. */
export async function generatePracticeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(generatePracticeSchema, formData);
  if (!parsed.success) return parsed.state;

  const studentId = Number(parsed.data.studentId);
  let createdId: number;

  try {
    const tutor = await getTutorOrThrow();
    const weak = await weakMaterialsForStudent(tutor.id, studentId, 3);
    if (weak.length === 0) {
      return fail("Belum ada jawaban salah yang tercatat untuk murid ini, jadi belum bisa dibuatkan latihan tambahan.");
    }

    const rows = await db
      .select({ name: students.name, nickname: students.nickname, grade: students.grade, programName: programs.name })
      .from(students)
      .leftJoin(programs, and(eq(programs.studentId, students.id), eq(programs.isActive, true)))
      .where(and(eq(students.id, studentId), eq(students.tutorId, tutor.id)))
      .limit(1);
    const student = rows[0];
    if (!student) return fail("Murid tidak ditemukan.");

    const materialLabel = weak.map((row) => row.material).join(", ");
    const result = await generateQuestions(tutor.id, {
      studentName: student.nickname || student.name,
      level: student.grade ?? "",
      programName: student.programName ?? "",
      material: materialLabel,
      count: 10,
      types: ["multiple_choice", "short_answer"],
      difficulty: "medium",
      extraInstructions: `Fokus pada materi yang masih sering salah: ${weak
        .map((row) => `${row.material} (salah ${row.wrongCount} dari ${row.answeredCount} soal)`)
        .join("; ")}.`,
    });

    if (result.questions.length === 0) {
      return fail("AI belum bisa membuat latihan saat ini. Coba lagi nanti.");
    }

    const created = await createAssignment(tutor.id, {
      studentId,
      title: `Latihan tambahan · ${formatDateShort(todayKey())}`,
      material: materialLabel,
      instructions: "Latihan ini dibuat otomatis dari materi yang masih sering salah.",
      difficulty: "medium",
      status: "draft",
    });
    createdId = created.id;

    await replaceQuestions(
      tutor.id,
      created.id,
      result.questions.map((q) => ({
        type: q.type,
        prompt: q.prompt,
        options: q.type === "multiple_choice" ? q.options : undefined,
        correctAnswer: q.correctAnswer ?? null,
        points: q.points,
        explanation: q.explanation ?? null,
      })),
      true,
    );

    revalidateAssignments(studentId, created.id);
  } catch (error) {
    if (error instanceof AssignmentError) return fail(error.message);
    return fail(errorMessage(error, "Gagal membuat latihan tambahan."));
  }

  redirect(`/assignments/${createdId}`);
}
