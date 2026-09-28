import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { parentStudents, students, type Student } from "@/db/schema";
import type { SessionUser } from "./auth";

export class AccessDeniedError extends Error {
  constructor(message = "Akses ditolak") {
    super(message);
    this.name = "AccessDeniedError";
  }
}

/** Daftar ID anak yang boleh dilihat user. Tutor: semua anak miliknya. Parent: anak yang tertaut. */
export async function accessibleStudentIds(user: SessionUser): Promise<number[]> {
  if (user.role === "tutor") {
    const rows = await db.select({ id: students.id }).from(students).where(eq(students.tutorId, user.id));
    return rows.map((r) => r.id);
  }
  const rows = await db
    .select({ id: parentStudents.studentId })
    .from(parentStudents)
    .where(eq(parentStudents.parentUserId, user.id));
  return rows.map((r) => r.id);
}

export async function canAccessStudent(user: SessionUser, studentId: number): Promise<boolean> {
  if (user.role === "tutor") {
    const row = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.tutorId, user.id)))
      .limit(1);
    return row.length > 0;
  }
  const row = await db
    .select({ id: parentStudents.id })
    .from(parentStudents)
    .where(and(eq(parentStudents.studentId, studentId), eq(parentStudents.parentUserId, user.id)))
    .limit(1);
  return row.length > 0;
}

export async function assertStudentAccess(user: SessionUser, studentId: number): Promise<void> {
  if (!Number.isInteger(studentId) || studentId <= 0) throw new AccessDeniedError();
  if (!(await canAccessStudent(user, studentId))) throw new AccessDeniedError();
}

export async function getStudentForUser(user: SessionUser, studentId: number): Promise<Student> {
  await assertStudentAccess(user, studentId);
  const rows = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const student = rows[0];
  if (!student) throw new AccessDeniedError();
  return student;
}

/** Kondisi `IN (...)` untuk membatasi query berdasarkan siswa yang bisa diakses. */
export function studentScopeCondition(column: Parameters<typeof inArray>[0], ids: number[]) {
  if (ids.length === 0) return inArray(column, [-1]);
  return inArray(column, ids);
}
