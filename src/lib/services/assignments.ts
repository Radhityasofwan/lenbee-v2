import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assignmentAttempts,
  assignments,
  attemptAnswers,
  programs,
  questions,
  students,
  type Assignment,
  type Question,
} from "@/db/schema";
import { gradeAnswer, gradeAttempt, type GradableQuestion } from "@/lib/domain/grading";
import { notifyParents, pushNotification } from "@/lib/services/notifications";

export class AssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssignmentError";
  }
}

export type AssignmentInput = {
  studentId: number;
  programId?: number | null;
  title: string;
  material?: string | null;
  instructions?: string | null;
  difficulty: "easy" | "medium" | "hard";
  status: "draft" | "published" | "archived";
};

export type QuestionInput = {
  type: "multiple_choice" | "short_answer" | "essay";
  prompt: string;
  options?: string[];
  correctAnswer?: string | null;
  points: number;
  explanation?: string | null;
};

export type AssignmentListItem = {
  assignment: Assignment;
  studentName: string;
  studentNickname: string | null;
  studentColor: string;
  programName: string | null;
  questionCount: number;
  attemptCount: number;
  bestScore: number | null;
};

async function assertOwnedAssignment(tutorId: number, assignmentId: number): Promise<Assignment> {
  const rows = await db
    .select({ assignment: assignments })
    .from(assignments)
    .innerJoin(students, eq(students.id, assignments.studentId))
    .where(and(eq(assignments.id, assignmentId), eq(students.tutorId, tutorId)))
    .limit(1);

  const assignment = rows[0]?.assignment;
  if (!assignment) throw new AssignmentError("Tugas tidak ditemukan.");
  return assignment;
}

export async function getOwnedAssignment(tutorId: number, assignmentId: number): Promise<Assignment> {
  return assertOwnedAssignment(tutorId, assignmentId);
}

export async function assignmentsForTutor(
  tutorId: number,
  options: {
    limit?: number;
    status?: Assignment["status"];
    orderBy?: "createdAt" | "updatedAt";
    studentId?: number;
  } = {},
): Promise<AssignmentListItem[]> {
  const { limit = 100, status, orderBy = "createdAt", studentId } = options;
  const conditions = [eq(students.tutorId, tutorId)];
  if (status) conditions.push(eq(assignments.status, status));
  if (studentId) conditions.push(eq(assignments.studentId, studentId));

  const rows = await db
    .select({
      assignment: assignments,
      studentName: students.name,
      studentNickname: students.nickname,
      studentColor: students.color,
      programName: programs.name,
      questionCount: sql<number>`(select count(*) from ${questions} where ${questions.assignmentId} = ${assignments.id})`,
      attemptCount: sql<number>`(select count(*) from ${assignmentAttempts} where ${assignmentAttempts.assignmentId} = ${assignments.id})`,
      bestScore: sql<number | null>`(select max(${assignmentAttempts.score}) from ${assignmentAttempts} where ${assignmentAttempts.assignmentId} = ${assignments.id} and ${assignmentAttempts.status} = 'graded')`,
    })
    .from(assignments)
    .innerJoin(students, eq(students.id, assignments.studentId))
    .leftJoin(programs, eq(programs.id, assignments.programId))
    .where(and(...conditions))
    .orderBy(desc(orderBy === "updatedAt" ? assignments.updatedAt : assignments.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    questionCount: Number(row.questionCount),
    attemptCount: Number(row.attemptCount),
    bestScore: row.bestScore === null ? null : Number(row.bestScore),
  }));
}

export async function assignmentsForStudent(tutorId: number, studentId: number): Promise<Assignment[]> {
  await assertStudentOwned(tutorId, studentId);
  return db
    .select()
    .from(assignments)
    .where(eq(assignments.studentId, studentId))
    .orderBy(desc(assignments.createdAt));
}

export type WeakMaterial = { material: string; wrongCount: number; answeredCount: number };

/** Materi dengan jawaban salah terbanyak dari tugas yang sudah dinilai — dasar untuk latihan tambahan. */
export async function weakMaterialsForStudent(
  tutorId: number,
  studentId: number,
  limit = 5,
): Promise<WeakMaterial[]> {
  await assertStudentOwned(tutorId, studentId);

  const rows = await db
    .select({
      material: assignments.material,
      wrongCount: sql<number>`sum(case when ${attemptAnswers.isCorrect} = false then 1 else 0 end)`,
      answeredCount: sql<number>`count(*)`,
    })
    .from(attemptAnswers)
    .innerJoin(assignmentAttempts, eq(assignmentAttempts.id, attemptAnswers.attemptId))
    .innerJoin(assignments, eq(assignments.id, assignmentAttempts.assignmentId))
    .where(and(eq(assignments.studentId, studentId), isNotNull(attemptAnswers.isCorrect), isNotNull(assignments.material)))
    .groupBy(assignments.material)
    .having(sql`sum(case when ${attemptAnswers.isCorrect} = false then 1 else 0 end) > 0`)
    .orderBy(desc(sql`sum(case when ${attemptAnswers.isCorrect} = false then 1 else 0 end)`))
    .limit(limit);

  return rows
    .filter((row): row is { material: string; wrongCount: number; answeredCount: number } => row.material !== null)
    .map((row) => ({ material: row.material, wrongCount: Number(row.wrongCount), answeredCount: Number(row.answeredCount) }));
}

export async function publishedAssignmentsForParent(studentIds: number[]): Promise<Assignment[]> {
  if (studentIds.length === 0) return [];
  return db
    .select()
    .from(assignments)
    .where(and(inArray(assignments.studentId, studentIds), eq(assignments.status, "published")))
    .orderBy(desc(assignments.createdAt));
}

async function assertStudentOwned(tutorId: number, studentId: number): Promise<void> {
  const rows = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.tutorId, tutorId)))
    .limit(1);
  if (rows.length === 0) throw new AssignmentError("Murid tidak ditemukan.");
}

export async function createAssignment(tutorId: number, input: AssignmentInput): Promise<Assignment> {
  await assertStudentOwned(tutorId, input.studentId);

  const ids = await db
    .insert(assignments)
    .values({
      studentId: input.studentId,
      programId: input.programId ?? null,
      title: input.title,
      material: input.material ?? null,
      instructions: input.instructions ?? null,
      difficulty: input.difficulty,
      status: input.status,
      publicToken: randomBytes(24).toString("base64url"),
      createdByUserId: tutorId,
    })
    .$returningId();

  const created = ids[0];
  if (!created) throw new AssignmentError("Gagal menyimpan tugas.");

  return getOwnedAssignment(tutorId, created.id);
}

export async function updateAssignment(
  tutorId: number,
  assignmentId: number,
  input: Omit<AssignmentInput, "studentId">,
): Promise<void> {
  await assertOwnedAssignment(tutorId, assignmentId);
  await db
    .update(assignments)
    .set({
      programId: input.programId ?? null,
      title: input.title,
      material: input.material ?? null,
      instructions: input.instructions ?? null,
      difficulty: input.difficulty,
      status: input.status,
    })
    .where(eq(assignments.id, assignmentId));
}

export async function setAssignmentStatus(
  tutorId: number,
  assignmentId: number,
  status: "draft" | "published" | "archived",
): Promise<void> {
  await assertOwnedAssignment(tutorId, assignmentId);
  await db.update(assignments).set({ status }).where(eq(assignments.id, assignmentId));
}

export async function deleteAssignment(tutorId: number, assignmentId: number): Promise<void> {
  await assertOwnedAssignment(tutorId, assignmentId);
  await db.delete(assignments).where(eq(assignments.id, assignmentId));
}

export async function questionsForAssignment(assignmentId: number): Promise<Question[]> {
  return db
    .select()
    .from(questions)
    .where(eq(questions.assignmentId, assignmentId))
    .orderBy(asc(questions.orderIndex), asc(questions.id));
}

export async function replaceQuestions(
  tutorId: number,
  assignmentId: number,
  items: QuestionInput[],
  aiGenerated = false,
): Promise<void> {
  await assertOwnedAssignment(tutorId, assignmentId);

  await db.transaction(async (tx) => {
    await tx.delete(questions).where(eq(questions.assignmentId, assignmentId));

    if (items.length > 0) {
      await tx.insert(questions).values(
        items.map((item, index) => ({
          assignmentId,
          orderIndex: index,
          type: item.type,
          prompt: item.prompt,
          options: item.type === "multiple_choice" ? (item.options ?? []) : null,
          correctAnswer: item.correctAnswer?.trim() ? item.correctAnswer.trim() : null,
          points: item.points,
          explanation: item.explanation?.trim() ? item.explanation.trim() : null,
        })),
      );
    }

    if (aiGenerated) {
      await tx.update(assignments).set({ aiGenerated: true }).where(eq(assignments.id, assignmentId));
    }
  });
}

/* -------------------------------- Attempts -------------------------------- */

export type AttemptRow = {
  attempt: typeof assignmentAttempts.$inferSelect;
  studentName: string;
  studentNickname: string | null;
};

export async function attemptsForAssignment(tutorId: number, assignmentId: number): Promise<AttemptRow[]> {
  await assertOwnedAssignment(tutorId, assignmentId);
  return db
    .select({
      attempt: assignmentAttempts,
      studentName: students.name,
      studentNickname: students.nickname,
    })
    .from(assignmentAttempts)
    .innerJoin(students, eq(students.id, assignmentAttempts.studentId))
    .where(eq(assignmentAttempts.assignmentId, assignmentId))
    .orderBy(desc(assignmentAttempts.createdAt));
}

export async function getOwnedAttempt(tutorId: number, attemptId: number) {
  const rows = await db
    .select({ attempt: assignmentAttempts, assignment: assignments })
    .from(assignmentAttempts)
    .innerJoin(assignments, eq(assignments.id, assignmentAttempts.assignmentId))
    .innerJoin(students, eq(students.id, assignments.studentId))
    .where(and(eq(assignmentAttempts.id, attemptId), eq(students.tutorId, tutorId)))
    .limit(1);

  const row = rows[0];
  if (!row) throw new AssignmentError("Pengerjaan tidak ditemukan.");
  return row;
}

export type AnswerRow = typeof attemptAnswers.$inferSelect;

export async function answersForAttempt(attemptId: number): Promise<AnswerRow[]> {
  return db.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId));
}

export async function startAttempt(tutorId: number, assignmentId: number) {
  const assignment = await assertOwnedAssignment(tutorId, assignmentId);
  const existing = await db
    .select()
    .from(assignmentAttempts)
    .where(and(eq(assignmentAttempts.assignmentId, assignmentId), eq(assignmentAttempts.status, "in_progress")))
    .limit(1);

  if (existing[0]) return existing[0];

  const maxScore = (await questionsForAssignment(assignmentId)).reduce((sum, q) => sum + q.points, 0);
  const ids = await db
    .insert(assignmentAttempts)
    .values({ assignmentId, studentId: assignment.studentId, maxScore })
    .$returningId();

  const created = ids[0];
  if (!created) throw new AssignmentError("Gagal memulai pengerjaan.");

  const rows = await db.select().from(assignmentAttempts).where(eq(assignmentAttempts.id, created.id)).limit(1);
  const attempt = rows[0];
  if (!attempt) throw new AssignmentError("Gagal memulai pengerjaan.");
  return attempt;
}

function toGradable(rows: Question[]): GradableQuestion[] {
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    prompt: row.prompt,
    options: row.options,
    correctAnswer: row.correctAnswer,
    points: row.points,
  }));
}

type AttemptRecord = typeof assignmentAttempts.$inferSelect;

/** Beri tahu pengajar saat murid mengumpulkan latihan lewat link publik. */
async function notifyTutorOfSubmission(assignment: Assignment, attemptId: number): Promise<void> {
  const [student] = await db
    .select({ name: students.name, nickname: students.nickname })
    .from(students)
    .where(eq(students.id, assignment.studentId))
    .limit(1);
  const label = student?.nickname || student?.name || "Murid";

  await pushNotification({
    userId: assignment.createdByUserId,
    type: "assignment_submitted",
    title: `Latihan dikumpulkan: ${label}`,
    body: assignment.title,
    link: `/assignments/${assignment.id}`,
    dedupeKey: `assignment_submitted:${attemptId}`,
  });
}

/** Beri tahu orang tua begitu hasil latihan anaknya keluar (otomatis atau setelah dinilai manual). */
async function notifyParentsOfResult(assignment: Assignment, attemptId: number, score: number, maxScore: number): Promise<void> {
  await notifyParents(assignment.studentId, {
    type: "info",
    title: `Hasil latihan: ${assignment.title}`,
    body: `Skor ${score}/${maxScore}`,
    link: "/parent",
    dedupeKey: `parent_attempt:${attemptId}`,
  });
}

/** Dipakai oleh alur tutor (submitAttempt) dan alur link publik (submitAttemptByToken). */
async function finalizeAttempt(
  attempt: AttemptRecord,
  questionRows: Question[],
  answers: { questionId: number; answer: string }[],
): Promise<{ score: number; maxScore: number; needsManualReview: boolean }> {
  const answerMap: Record<number, string> = {};
  for (const item of answers) answerMap[item.questionId] = item.answer;

  const graded = gradeAttempt(toGradable(questionRows), answerMap);
  const attemptId = attempt.id;

  await db.transaction(async (tx) => {
    await tx.delete(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId));

    await tx.insert(attemptAnswers).values(
      graded.results.map((result) => ({
        attemptId,
        questionId: result.questionId,
        answer: answerMap[result.questionId] ?? "",
        isCorrect: result.isCorrect,
        pointsAwarded: result.pointsAwarded,
        feedback: result.feedback,
      })),
    );

    await tx
      .update(assignmentAttempts)
      .set({
        status: graded.needsManualReview ? "submitted" : "graded",
        score: graded.score,
        maxScore: graded.maxScore,
        submittedAt: new Date(),
        gradedAt: graded.needsManualReview ? null : new Date(),
      })
      .where(eq(assignmentAttempts.id, attemptId));
  });

  return { score: graded.score, maxScore: graded.maxScore, needsManualReview: graded.needsManualReview };
}

/** Menyimpan jawaban, menilai otomatis pilihan ganda & isian singkat, uraian menunggu penilaian manual. */
export async function submitAttempt(
  tutorId: number,
  attemptId: number,
  answers: { questionId: number; answer: string }[],
): Promise<{ score: number; maxScore: number; needsManualReview: boolean }> {
  const { attempt, assignment } = await getOwnedAttempt(tutorId, attemptId);
  if (attempt.status === "graded") throw new AssignmentError("Pengerjaan ini sudah dinilai.");

  const questionRows = await questionsForAssignment(attempt.assignmentId);
  if (questionRows.length === 0) throw new AssignmentError("Tugas ini belum punya soal.");

  const result = await finalizeAttempt(attempt, questionRows, answers);
  if (!result.needsManualReview) {
    await notifyParentsOfResult(assignment, attemptId, result.score, result.maxScore);
  }
  return result;
}

/* ---------------------------- Link publik (anak) --------------------------- */

export type PublicAssignmentQuestion = {
  id: number;
  orderIndex: number;
  type: Question["type"];
  prompt: string;
  options: string[] | null;
  points: number;
};

export type PublicAssignmentView = {
  assignment: Assignment;
  studentName: string;
  studentNickname: string | null;
  questions: PublicAssignmentQuestion[];
  attempt: AttemptRecord | null;
};

/** Hanya tugas berstatus "published" yang boleh diakses lewat link — draf/arsip tetap tersembunyi. */
async function assignmentByToken(token: string): Promise<Assignment | null> {
  const rows = await db.select().from(assignments).where(eq(assignments.publicToken, token)).limit(1);
  const assignment = rows[0];
  return assignment && assignment.status === "published" ? assignment : null;
}

/** Ringkasan tugas untuk anak — tanpa correctAnswer/explanation agar tidak bocor sebelum dikerjakan. */
export async function getAssignmentByToken(token: string): Promise<PublicAssignmentView | null> {
  const assignment = await assignmentByToken(token);
  if (!assignment) return null;

  const [student] = await db
    .select({ name: students.name, nickname: students.nickname })
    .from(students)
    .where(eq(students.id, assignment.studentId))
    .limit(1);
  if (!student) return null;

  const questionRows = await questionsForAssignment(assignment.id);
  const attemptRows = await db
    .select()
    .from(assignmentAttempts)
    .where(eq(assignmentAttempts.assignmentId, assignment.id))
    .orderBy(desc(assignmentAttempts.createdAt))
    .limit(1);

  return {
    assignment,
    studentName: student.name,
    studentNickname: student.nickname,
    questions: questionRows.map((q) => ({
      id: q.id,
      orderIndex: q.orderIndex,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      points: q.points,
    })),
    attempt: attemptRows[0] ?? null,
  };
}

export async function startAttemptByToken(token: string): Promise<AttemptRecord> {
  const assignment = await assignmentByToken(token);
  if (!assignment) throw new AssignmentError("Tugas tidak ditemukan.");

  const existing = await db
    .select()
    .from(assignmentAttempts)
    .where(and(eq(assignmentAttempts.assignmentId, assignment.id), eq(assignmentAttempts.status, "in_progress")))
    .limit(1);
  if (existing[0]) return existing[0];

  const questionRows = await questionsForAssignment(assignment.id);
  if (questionRows.length === 0) throw new AssignmentError("Tugas ini belum punya soal.");
  const maxScore = questionRows.reduce((sum, q) => sum + q.points, 0);

  const ids = await db
    .insert(assignmentAttempts)
    .values({ assignmentId: assignment.id, studentId: assignment.studentId, maxScore })
    .$returningId();
  const created = ids[0];
  if (!created) throw new AssignmentError("Gagal memulai pengerjaan.");

  const rows = await db.select().from(assignmentAttempts).where(eq(assignmentAttempts.id, created.id)).limit(1);
  const attempt = rows[0];
  if (!attempt) throw new AssignmentError("Gagal memulai pengerjaan.");
  return attempt;
}

export async function submitAttemptByToken(
  token: string,
  attemptId: number,
  answers: { questionId: number; answer: string }[],
): Promise<{ score: number; maxScore: number; needsManualReview: boolean }> {
  const assignment = await assignmentByToken(token);
  if (!assignment) throw new AssignmentError("Tugas tidak ditemukan.");

  const rows = await db
    .select()
    .from(assignmentAttempts)
    .where(and(eq(assignmentAttempts.id, attemptId), eq(assignmentAttempts.assignmentId, assignment.id)))
    .limit(1);
  const attempt = rows[0];
  if (!attempt) throw new AssignmentError("Pengerjaan tidak ditemukan.");
  if (attempt.status === "graded") throw new AssignmentError("Pengerjaan ini sudah dinilai.");

  const questionRows = await questionsForAssignment(assignment.id);
  if (questionRows.length === 0) throw new AssignmentError("Tugas ini belum punya soal.");

  const result = await finalizeAttempt(attempt, questionRows, answers);
  await notifyTutorOfSubmission(assignment, attemptId);
  if (!result.needsManualReview) {
    await notifyParentsOfResult(assignment, attemptId, result.score, result.maxScore);
  }
  return result;
}

/** Penilaian manual untuk soal uraian. */
export async function gradeAttemptManually(
  tutorId: number,
  attemptId: number,
  grades: { questionId: number; isCorrect?: "true" | "false" | ""; pointsAwarded?: number; feedback?: string | null }[],
): Promise<void> {
  const { attempt, assignment } = await getOwnedAttempt(tutorId, attemptId);
  const questionRows = await questionsForAssignment(attempt.assignmentId);
  const pointById = new Map(questionRows.map((row) => [row.id, row.points]));

  for (const item of grades) {
    const maxPoints = pointById.get(item.questionId);
    if (maxPoints === undefined) continue;

    const awarded = Math.min(Math.max(Math.round(item.pointsAwarded ?? 0), 0), maxPoints);
    const isCorrect = item.isCorrect === "" || item.isCorrect === undefined ? null : item.isCorrect === "true";

    await db
      .update(attemptAnswers)
      .set({ pointsAwarded: awarded, isCorrect, feedback: item.feedback?.trim() ? item.feedback.trim() : null })
      .where(and(eq(attemptAnswers.attemptId, attempt.id), eq(attemptAnswers.questionId, item.questionId)));
  }

  const rows = await db.select().from(attemptAnswers).where(eq(attemptAnswers.attemptId, attempt.id));
  const score = rows.reduce((sum, row) => sum + row.pointsAwarded, 0);
  const maxScore = questionRows.reduce((sum, row) => sum + row.points, 0);

  await db
    .update(assignmentAttempts)
    .set({ status: "graded", score, maxScore, gradedAt: new Date() })
    .where(eq(assignmentAttempts.id, attempt.id));

  await notifyParentsOfResult(assignment, attempt.id, score, maxScore);
}

/** Menilai ulang satu jawaban secara otomatis (dipakai saat kunci jawaban diperbaiki). */
export async function regradeAnswer(question: Question, answer: string | null) {
  return gradeAnswer(toGradable([question])[0]!, answer);
}
