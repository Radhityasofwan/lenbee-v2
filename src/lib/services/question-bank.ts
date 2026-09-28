import "server-only";
import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { bankQuestions, type BankQuestion } from "@/db/schema";
import type { QuestionInput } from "@/lib/services/assignments";

export class BankQuestionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BankQuestionError";
  }
}

export type BankQuestionMeta = {
  subject: string;
  grade?: string | null;
  material: string;
  difficulty: "easy" | "medium" | "hard";
};

export type BankQuestionFilters = {
  subject?: string;
  grade?: string;
  material?: string;
  type?: "multiple_choice" | "short_answer" | "essay";
  search?: string;
};

async function assertOwned(tutorId: number, id: number): Promise<BankQuestion> {
  const rows = await db
    .select()
    .from(bankQuestions)
    .where(and(eq(bankQuestions.id, id), eq(bankQuestions.tutorId, tutorId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new BankQuestionError("Soal tidak ditemukan di bank.");
  return row;
}

export async function getOwnedBankQuestion(tutorId: number, id: number): Promise<BankQuestion> {
  return assertOwned(tutorId, id);
}

export async function listBankQuestions(
  tutorId: number,
  filters: BankQuestionFilters = {},
): Promise<BankQuestion[]> {
  const conditions = [eq(bankQuestions.tutorId, tutorId)];
  if (filters.subject) conditions.push(eq(bankQuestions.subject, filters.subject));
  if (filters.grade) conditions.push(eq(bankQuestions.grade, filters.grade));
  if (filters.material) conditions.push(like(bankQuestions.material, `%${filters.material}%`));
  if (filters.type) conditions.push(eq(bankQuestions.type, filters.type));

  const rows = await db
    .select()
    .from(bankQuestions)
    .where(and(...conditions))
    .orderBy(desc(bankQuestions.updatedAt))
    .limit(200);

  const search = filters.search?.trim().toLowerCase();
  if (!search) return rows;

  return rows.filter((row) =>
    [row.subject, row.material, row.prompt, row.grade]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(search)),
  );
}

/** Nilai unik untuk dropdown filter — mapel/kelas/bab yang benar-benar pernah dipakai tutor ini. */
export async function bankFacets(
  tutorId: number,
): Promise<{ subjects: string[]; grades: string[]; materials: string[] }> {
  const rows = await db
    .select({ subject: bankQuestions.subject, grade: bankQuestions.grade, material: bankQuestions.material })
    .from(bankQuestions)
    .where(eq(bankQuestions.tutorId, tutorId));

  const subjects = new Set<string>();
  const grades = new Set<string>();
  const materials = new Set<string>();
  for (const row of rows) {
    subjects.add(row.subject);
    if (row.grade) grades.add(row.grade);
    materials.add(row.material);
  }
  return {
    subjects: [...subjects].sort(),
    grades: [...grades].sort(),
    materials: [...materials].sort(),
  };
}

export async function createBankQuestions(
  tutorId: number,
  meta: BankQuestionMeta,
  items: QuestionInput[],
): Promise<number> {
  if (items.length === 0) return 0;

  await db.insert(bankQuestions).values(
    items.map((item) => ({
      tutorId,
      subject: meta.subject,
      grade: meta.grade?.trim() ? meta.grade.trim() : null,
      material: meta.material,
      difficulty: meta.difficulty,
      type: item.type,
      prompt: item.prompt,
      options: item.type === "multiple_choice" ? (item.options ?? []) : null,
      correctAnswer: item.correctAnswer?.trim() ? item.correctAnswer.trim() : null,
      points: item.points,
      explanation: item.explanation?.trim() ? item.explanation.trim() : null,
    })),
  );

  return items.length;
}

export async function deleteBankQuestion(tutorId: number, id: number): Promise<void> {
  await assertOwned(tutorId, id);
  await db.delete(bankQuestions).where(eq(bankQuestions.id, id));
}

export async function incrementBankUsage(tutorId: number, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(bankQuestions)
    .set({ usageCount: sql`${bankQuestions.usageCount} + 1` })
    .where(and(eq(bankQuestions.tutorId, tutorId), inArray(bankQuestions.id, ids)));
}
