import "server-only";
import { and, asc, desc, eq, gte, inArray, like, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  lessonSessions,
  parentStudents,
  programs,
  schedules,
  students,
  users,
  type Program,
  type Schedule,
  type Student,
} from "@/db/schema";
import { todayKey } from "@/lib/datetime";
import type { StudentInput, ProgramInput, ScheduleInput } from "@/lib/validation";

export class StudentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudentError";
  }
}

/* ------------------------------- Students -------------------------------- */

export type StudentListItem = Student & {
  programCount: number;
  lastLessonDate: string | null;
  nextLessonDate: string | null;
};

export async function listStudents(
  tutorId: number,
  options: { search?: string; includeInactive?: boolean } = {},
): Promise<StudentListItem[]> {
  const today = todayKey();
  const filters = [eq(students.tutorId, tutorId)];
  if (!options.includeInactive) filters.push(eq(students.isActive, true));
  if (options.search) {
    const term = `%${options.search}%`;
    const search = or(
      like(students.name, term),
      like(students.nickname, term),
      like(students.school, term),
      like(students.parentName, term),
    );
    if (search) filters.push(search);
  }

  const rows = await db
    .select({
      student: students,
      programCount: sql<number>`(select count(*) from ${programs} where ${programs.studentId} = ${students.id} and ${programs.isActive} = true)`,
      lastLessonDate: sql<
        string | null
      >`(select max(${lessonSessions.date}) from ${lessonSessions} where ${lessonSessions.studentId} = ${students.id} and ${lessonSessions.status} = 'completed')`,
      nextLessonDate: sql<
        string | null
      >`(select min(${lessonSessions.date}) from ${lessonSessions} where ${lessonSessions.studentId} = ${students.id} and ${lessonSessions.status} = 'scheduled' and ${lessonSessions.date} >= ${today})`,
    })
    .from(students)
    .where(and(...filters))
    .orderBy(asc(students.name));

  return rows.map((row) => ({
    ...row.student,
    programCount: Number(row.programCount ?? 0),
    lastLessonDate: row.lastLessonDate ?? null,
    nextLessonDate: row.nextLessonDate ?? null,
  }));
}

export async function getOwnedStudent(tutorId: number, studentId: number): Promise<Student> {
  if (!Number.isInteger(studentId) || studentId <= 0) throw new StudentError("Murid tidak valid.");
  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.tutorId, tutorId)))
    .limit(1);
  if (!student) throw new StudentError("Murid tidak ditemukan.");
  return student;
}

export async function createStudent(tutorId: number, input: StudentInput): Promise<Student> {
  const id = await db
    .insert(students)
    .values({
      tutorId,
      name: input.name,
      nickname: input.nickname ?? null,
      birthDate: input.birthDate ?? null,
      school: input.school ?? null,
      grade: input.grade ?? null,
      color: input.color,
      notes: input.notes ?? null,
      parentName: input.parentName ?? null,
      parentPhone: input.parentPhone ?? null,
      parentEmail: input.parentEmail ?? null,
      isActive: input.isActive,
      reportFormat: input.reportFormat,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
    })
    .$returningId();

  const student = await getOwnedStudent(tutorId, id[0]!.id);
  await linkParentByEmail(student);
  return student;
}

export async function updateStudent(
  tutorId: number,
  studentId: number,
  input: StudentInput,
): Promise<Student> {
  await getOwnedStudent(tutorId, studentId);

  await db
    .update(students)
    .set({
      name: input.name,
      nickname: input.nickname ?? null,
      birthDate: input.birthDate ?? null,
      school: input.school ?? null,
      grade: input.grade ?? null,
      color: input.color,
      notes: input.notes ?? null,
      parentName: input.parentName ?? null,
      parentPhone: input.parentPhone ?? null,
      parentEmail: input.parentEmail ?? null,
      isActive: input.isActive,
      reportFormat: input.reportFormat,
      periodStart: input.periodStart ?? null,
      periodEnd: input.periodEnd ?? null,
    })
    .where(eq(students.id, studentId));

  const student = await getOwnedStudent(tutorId, studentId);
  await linkParentByEmail(student);
  return student;
}

export async function setStudentActive(
  tutorId: number,
  studentId: number,
  isActive: boolean,
): Promise<void> {
  await getOwnedStudent(tutorId, studentId);
  await db.update(students).set({ isActive }).where(eq(students.id, studentId));
}

/** Menautkan akun orang tua yang emailnya sama, supaya mereka langsung bisa login dan melihat anaknya. */
async function linkParentByEmail(student: Student): Promise<void> {
  if (!student.parentEmail) return;
  const [parent] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, student.parentEmail), eq(users.role, "parent")))
    .limit(1);
  if (!parent) return;

  await db
    .insert(parentStudents)
    .values({ parentUserId: parent.id, studentId: student.id })
    .onDuplicateKeyUpdate({ set: { studentId: student.id } });
}

/* ------------------------------- Programs -------------------------------- */

export async function programsForStudent(studentId: number): Promise<Program[]> {
  return db
    .select()
    .from(programs)
    .where(eq(programs.studentId, studentId))
    .orderBy(desc(programs.isActive), asc(programs.name));
}

export async function activeProgramsForTutor(tutorId: number) {
  return db
    .select({
      id: programs.id,
      name: programs.name,
      subject: programs.subject,
      rate: programs.rate,
      rateUnit: programs.rateUnit,
      defaultDurationMinutes: programs.defaultDurationMinutes,
      studentId: programs.studentId,
      studentName: students.name,
      studentNickname: students.nickname,
    })
    .from(programs)
    .innerJoin(students, eq(students.id, programs.studentId))
    .where(and(eq(students.tutorId, tutorId), eq(programs.isActive, true), eq(students.isActive, true)))
    .orderBy(asc(students.name), asc(programs.name));
}

export async function getOwnedProgram(tutorId: number, programId: number): Promise<Program> {
  const [program] = await db
    .select({ program: programs })
    .from(programs)
    .innerJoin(students, eq(students.id, programs.studentId))
    .where(and(eq(programs.id, programId), eq(students.tutorId, tutorId)))
    .limit(1);
  if (!program) throw new StudentError("Program tidak ditemukan.");
  return program.program;
}

export async function createProgram(
  tutorId: number,
  input: ProgramInput,
): Promise<Program> {
  const student = await getOwnedStudent(tutorId, Number(input.studentId));
  const id = await db
    .insert(programs)
    .values({
      studentId: student.id,
      name: input.name,
      subject: input.subject,
      color: input.color,
      rate: input.rate,
      rateUnit: input.rateUnit,
      defaultDurationMinutes: input.defaultDurationMinutes,
      sessionsPerMonth: input.sessionsPerMonth ?? null,
      description: input.description ?? null,
      isActive: input.isActive,
    })
    .$returningId();
  return getOwnedProgram(tutorId, id[0]!.id);
}

export async function updateProgram(
  tutorId: number,
  programId: number,
  input: ProgramInput,
): Promise<Program> {
  const existing = await getOwnedProgram(tutorId, programId);
  await getOwnedStudent(tutorId, Number(input.studentId));

  await db
    .update(programs)
    .set({
      studentId: Number(input.studentId),
      name: input.name,
      subject: input.subject,
      color: input.color,
      rate: input.rate,
      rateUnit: input.rateUnit,
      defaultDurationMinutes: input.defaultDurationMinutes,
      sessionsPerMonth: input.sessionsPerMonth ?? null,
      description: input.description ?? null,
      isActive: input.isActive,
    })
    .where(eq(programs.id, existing.id));

  return getOwnedProgram(tutorId, programId);
}

export async function deleteProgram(tutorId: number, programId: number): Promise<void> {
  await getOwnedProgram(tutorId, programId);
  const [used] = await db
    .select({ count: sql<number>`count(*)` })
    .from(lessonSessions)
    .where(eq(lessonSessions.programId, programId));

  if (Number(used?.count ?? 0) > 0) {
    throw new StudentError("Program sudah punya riwayat pertemuan. Nonaktifkan saja agar riwayat tetap utuh.");
  }
  await db.delete(programs).where(eq(programs.id, programId));
}

/* ------------------------------- Schedules ------------------------------- */

export type ScheduleWithNames = Schedule & {
  studentName: string;
  studentNickname: string | null;
  studentColor: string;
  programName: string;
  programSubject: string | null;
};

export async function schedulesForTutor(
  tutorId: number,
  options: { studentId?: number; includeInactive?: boolean } = {},
): Promise<ScheduleWithNames[]> {
  const filters = [eq(students.tutorId, tutorId)];
  if (options.studentId) filters.push(eq(schedules.studentId, options.studentId));
  if (!options.includeInactive) filters.push(eq(schedules.isActive, true));

  return db
    .select({
      id: schedules.id,
      studentId: schedules.studentId,
      programId: schedules.programId,
      dayOfWeek: schedules.dayOfWeek,
      startTime: schedules.startTime,
      durationMinutes: schedules.durationMinutes,
      frequency: schedules.frequency,
      startDate: schedules.startDate,
      endDate: schedules.endDate,
      location: schedules.location,
      isActive: schedules.isActive,
      notes: schedules.notes,
      createdAt: schedules.createdAt,
      updatedAt: schedules.updatedAt,
      studentName: students.name,
      studentNickname: students.nickname,
      studentColor: students.color,
      programName: programs.name,
      programSubject: programs.subject,
    })
    .from(schedules)
    .innerJoin(students, eq(students.id, schedules.studentId))
    .innerJoin(programs, eq(programs.id, schedules.programId))
    .where(and(...filters))
    .orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime));
}

export async function getOwnedSchedule(tutorId: number, scheduleId: number): Promise<ScheduleWithNames> {
  const rows = await db
    .select({
      id: schedules.id,
      studentId: schedules.studentId,
      programId: schedules.programId,
      dayOfWeek: schedules.dayOfWeek,
      startTime: schedules.startTime,
      durationMinutes: schedules.durationMinutes,
      frequency: schedules.frequency,
      startDate: schedules.startDate,
      endDate: schedules.endDate,
      location: schedules.location,
      isActive: schedules.isActive,
      notes: schedules.notes,
      createdAt: schedules.createdAt,
      updatedAt: schedules.updatedAt,
      studentName: students.name,
      studentNickname: students.nickname,
      studentColor: students.color,
      programName: programs.name,
      programSubject: programs.subject,
    })
    .from(schedules)
    .innerJoin(students, eq(students.id, schedules.studentId))
    .innerJoin(programs, eq(programs.id, schedules.programId))
    .where(and(eq(schedules.id, scheduleId), eq(students.tutorId, tutorId)))
    .limit(1);

  const schedule = rows[0];
  if (!schedule) throw new StudentError("Jadwal tidak ditemukan.");
  return schedule;
}

export async function createSchedule(
  tutorId: number,
  input: ScheduleInput,
): Promise<Schedule> {
  const student = await getOwnedStudent(tutorId, Number(input.studentId));
  const programId = input.programId ? Number(input.programId) : null;
  if (!programId) throw new StudentError("Pilih program untuk jadwal ini.");
  await getOwnedProgram(tutorId, programId);

  if (input.endDate && input.endDate < input.startDate) {
    throw new StudentError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  }
  await assertNoScheduleConflict(student.id, input.dayOfWeek, input.startTime, input.durationMinutes);

  const id = await db
    .insert(schedules)
    .values({
      studentId: student.id,
      programId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      isActive: input.isActive,
    })
    .$returningId();

  const [created] = await db.select().from(schedules).where(eq(schedules.id, id[0]!.id)).limit(1);
  return created!;
}

export async function updateSchedule(
  tutorId: number,
  scheduleId: number,
  input: ScheduleInput,
): Promise<Schedule> {
  const existing = await getOwnedSchedule(tutorId, scheduleId);
  const programId = input.programId ? Number(input.programId) : existing.programId;
  await getOwnedProgram(tutorId, programId);
  await getOwnedStudent(tutorId, Number(input.studentId));

  if (input.endDate && input.endDate < input.startDate) {
    throw new StudentError("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  }
  await assertNoScheduleConflict(
    Number(input.studentId),
    input.dayOfWeek,
    input.startTime,
    input.durationMinutes,
    scheduleId,
  );

  await db
    .update(schedules)
    .set({
      studentId: Number(input.studentId),
      programId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      isActive: input.isActive,
    })
    .where(eq(schedules.id, scheduleId));

  const [updated] = await db.select().from(schedules).where(eq(schedules.id, scheduleId)).limit(1);
  return updated!;
}

export async function deleteSchedule(tutorId: number, scheduleId: number): Promise<void> {
  await getOwnedSchedule(tutorId, scheduleId);

  await db
    .delete(lessonSessions)
    .where(and(eq(lessonSessions.scheduleId, scheduleId), eq(lessonSessions.status, "scheduled")));

  await db.delete(schedules).where(eq(schedules.id, scheduleId));
}

async function assertNoScheduleConflict(
  studentId: number,
  dayOfWeek: number,
  startTime: string,
  durationMinutes: number,
  excludeId?: number,
): Promise<void> {
  const rows = await db
    .select({ id: schedules.id, startTime: schedules.startTime, durationMinutes: schedules.durationMinutes })
    .from(schedules)
    .where(
      and(
        eq(schedules.studentId, studentId),
        eq(schedules.dayOfWeek, dayOfWeek),
        eq(schedules.isActive, true),
      ),
    );

  const start = toMinutes(startTime);
  const end = start + durationMinutes;

  for (const row of rows) {
    if (excludeId && row.id === excludeId) continue;
    const otherStart = toMinutes(row.startTime);
    const otherEnd = otherStart + row.durationMinutes;
    if (start < otherEnd && otherStart < end) {
      throw new StudentError("Jadwal bentrok dengan jadwal lain murid ini di hari yang sama.");
    }
  }
}

function toMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

/* ------------------------------ Parents list ------------------------------ */

export async function parentsForStudents(studentIds: number[]) {
  if (studentIds.length === 0) return [];
  return db
    .select({
      parentUserId: parentStudents.parentUserId,
      studentId: parentStudents.studentId,
      relation: parentStudents.relation,
      name: users.name,
      email: users.email,
      phone: users.phone,
    })
    .from(parentStudents)
    .innerJoin(users, eq(users.id, parentStudents.parentUserId))
    .where(inArray(parentStudents.studentId, studentIds));
}

/** Dipakai halaman detail murid: ringkasan cepat tanpa query berat. */
export async function studentSummary(tutorId: number, studentId: number) {
  const student = await getOwnedStudent(tutorId, studentId);
  const today = todayKey();

  const [counts] = await db
    .select({
      completed: sql<number>`sum(case when ${lessonSessions.status} = 'completed' then 1 else 0 end)`,
      cancelled: sql<number>`sum(case when ${lessonSessions.status} = 'cancelled' then 1 else 0 end)`,
      scheduled: sql<number>`sum(case when ${lessonSessions.status} = 'scheduled' then 1 else 0 end)`,
      totalMinutes: sql<number>`coalesce(sum(case when ${lessonSessions.status} = 'completed' then ${lessonSessions.durationMinutes} else 0 end), 0)`,
    })
    .from(lessonSessions)
    .where(eq(lessonSessions.studentId, studentId));

  const [nextLesson] = await db
    .select()
    .from(lessonSessions)
    .where(
      and(
        eq(lessonSessions.studentId, studentId),
        eq(lessonSessions.status, "scheduled"),
        gte(lessonSessions.date, today),
      ),
    )
    .orderBy(asc(lessonSessions.date), asc(lessonSessions.startTime))
    .limit(1);

  const [lastLesson] = await db
    .select()
    .from(lessonSessions)
    .where(and(eq(lessonSessions.studentId, studentId), eq(lessonSessions.status, "completed")))
    .orderBy(desc(lessonSessions.date), desc(lessonSessions.startTime))
    .limit(1);

  return {
    student,
    counts: {
      completed: Number(counts?.completed ?? 0),
      cancelled: Number(counts?.cancelled ?? 0),
      scheduled: Number(counts?.scheduled ?? 0),
      totalMinutes: Number(counts?.totalMinutes ?? 0),
    },
    nextLesson: nextLesson ?? null,
    lastLesson: lastLesson ?? null,
  };
}

/** Rentang tanggal untuk filter riwayat. */
export function rangeFilters(from?: string, to?: string) {
  const filters = [];
  if (from) filters.push(gte(lessonSessions.date, from));
  if (to) filters.push(lte(lessonSessions.date, to));
  return filters;
}
