import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, ne, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  assignmentAttempts,
  assignments,
  lessonSessions,
  parentStudents,
  parentUpdates,
  programs,
  reportCheckItems,
  students,
  type ParentUpdate,
  type ReportCheckItem,
} from "@/db/schema";
import { formatDateShort } from "@/lib/datetime";
import { pushNotification } from "@/lib/services/notifications";

export class ReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportError";
  }
}

export type ParentUpdateListItem = {
  update: ParentUpdate;
  studentName: string;
  studentNickname: string | null;
  studentColor: string;
};

export type ParentUpdateKind = "weekly" | "monthly" | "brief" | "daily" | "custom";

export type ReportFormat = "narrative" | "checklist";

export type ReportCheckReason = "sudah_mampu" | "dengan_bantuan" | "perlu_dilatih";

export type ReportCheckItemInput = {
  label: string;
  checked: boolean;
  reason?: ReportCheckReason | null;
};

export type ParentUpdateInputData = {
  studentId: number;
  title: string;
  periodStart: string;
  periodEnd: string;
  body: string;
  kind: ParentUpdateKind;
  format: ReportFormat;
  checkItems: ReportCheckItemInput[];
  status: "draft" | "final" | "sent";
};

async function assertStudentOwned(tutorId: number, studentId: number): Promise<void> {
  const rows = await db
    .select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.tutorId, tutorId)))
    .limit(1);
  if (rows.length === 0) throw new ReportError("Murid tidak ditemukan.");
}

export async function getOwnedParentUpdate(tutorId: number, updateId: number): Promise<ParentUpdate> {
  const rows = await db
    .select({ update: parentUpdates })
    .from(parentUpdates)
    .innerJoin(students, eq(students.id, parentUpdates.studentId))
    .where(and(eq(parentUpdates.id, updateId), eq(students.tutorId, tutorId)))
    .limit(1);

  const update = rows[0]?.update;
  if (!update) throw new ReportError("Laporan tidak ditemukan.");
  return update;
}

export async function listParentUpdates(
  tutorId: number,
  filters: {
    studentId?: number;
    status?: "draft" | "final" | "sent";
    kind?: ParentUpdateKind;
    search?: string;
  } = {},
): Promise<ParentUpdateListItem[]> {
  const conditions: SQL[] = [eq(students.tutorId, tutorId)];
  if (filters.studentId) conditions.push(eq(parentUpdates.studentId, filters.studentId));
  if (filters.status) conditions.push(eq(parentUpdates.status, filters.status));
  if (filters.kind) conditions.push(eq(parentUpdates.kind, filters.kind));

  const rows = await db
    .select({
      update: parentUpdates,
      studentName: students.name,
      studentNickname: students.nickname,
      studentColor: students.color,
    })
    .from(parentUpdates)
    .innerJoin(students, eq(students.id, parentUpdates.studentId))
    .where(and(...conditions))
    .orderBy(desc(parentUpdates.periodEnd), desc(parentUpdates.id))
    .limit(200);

  const search = filters.search?.trim().toLowerCase();
  if (!search) return rows;

  return rows.filter((row) =>
    [row.update.title, row.update.body, row.studentName, row.studentNickname]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(search)),
  );
}

export async function createParentUpdate(
  tutorId: number,
  input: ParentUpdateInputData,
  aiGenerated = false,
): Promise<ParentUpdate> {
  await assertStudentOwned(tutorId, input.studentId);

  const ids = await db
    .insert(parentUpdates)
    .values({
      studentId: input.studentId,
      title: input.title,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      body: input.body,
      kind: input.kind,
      format: input.format,
      status: input.status,
      aiGenerated,
      createdByUserId: tutorId,
      sentAt: input.status === "sent" ? new Date() : null,
    })
    .$returningId();

  const created = ids[0];
  if (!created) throw new ReportError("Gagal menyimpan laporan.");

  await writeCheckItems(created.id, input);
  return getOwnedParentUpdate(tutorId, created.id);
}

/** Checklist hanya disimpan pada laporan format checklist; format lain dibersihkan. */
async function writeCheckItems(updateId: number, input: ParentUpdateInputData): Promise<void> {
  await db.delete(reportCheckItems).where(eq(reportCheckItems.updateId, updateId));

  const rows = input.format === "checklist" ? input.checkItems : [];
  if (rows.length === 0) return;

  await db.insert(reportCheckItems).values(
    rows.map((item, index) => ({
      updateId,
      label: item.label,
      checked: item.checked,
      reason: item.checked ? null : (item.reason ?? null),
      sortOrder: index,
    })),
  );
}

export async function updateParentUpdate(
  tutorId: number,
  updateId: number,
  input: Omit<ParentUpdateInputData, "studentId">,
  aiGenerated?: boolean,
): Promise<ParentUpdate> {
  const existing = await getOwnedParentUpdate(tutorId, updateId);

  await db
    .update(parentUpdates)
    .set({
      title: input.title,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      body: input.body,
      kind: input.kind,
      format: input.format,
      status: input.status,
      aiGenerated: aiGenerated ?? existing.aiGenerated,
      sentAt: input.status === "sent" ? (existing.sentAt ?? new Date()) : null,
    })
    .where(eq(parentUpdates.id, updateId));

  await writeCheckItems(updateId, { ...input, studentId: existing.studentId });

  return getOwnedParentUpdate(tutorId, updateId);
}

export async function deleteParentUpdate(tutorId: number, updateId: number): Promise<void> {
  await getOwnedParentUpdate(tutorId, updateId);
  await db.delete(parentUpdates).where(eq(parentUpdates.id, updateId));
}

/* ----------------------------- Report checklist ---------------------------- */

export async function listCheckItems(updateId: number): Promise<ReportCheckItem[]> {
  return db
    .select()
    .from(reportCheckItems)
    .where(eq(reportCheckItems.updateId, updateId))
    .orderBy(asc(reportCheckItems.sortOrder), asc(reportCheckItems.id));
}

/** Item checklist untuk banyak laporan sekaligus, dikelompokkan per updateId. */
export async function checkItemsForUpdates(updateIds: number[]): Promise<Map<number, ReportCheckItem[]>> {
  const grouped = new Map<number, ReportCheckItem[]>();
  if (updateIds.length === 0) return grouped;

  const rows = await db
    .select()
    .from(reportCheckItems)
    .where(inArray(reportCheckItems.updateId, updateIds))
    .orderBy(asc(reportCheckItems.sortOrder), asc(reportCheckItems.id));

  for (const row of rows) {
    const list = grouped.get(row.updateId);
    if (list) list.push(row);
    else grouped.set(row.updateId, [row]);
  }
  return grouped;
}

/** Label checklist dari laporan checklist terakhir anak ini, untuk prefill item baru. */
export async function latestChecklistLabels(studentId: number): Promise<string[]> {
  const rows = await db
    .select({ id: parentUpdates.id })
    .from(parentUpdates)
    .where(and(eq(parentUpdates.studentId, studentId), eq(parentUpdates.format, "checklist")))
    .orderBy(desc(parentUpdates.periodEnd), desc(parentUpdates.id))
    .limit(1);

  const latest = rows[0];
  if (!latest) return [];

  const items = await listCheckItems(latest.id);
  return items.map((item) => item.label);
}

/** Laporan yang boleh dilihat orang tua: semua kecuali draft. */
export async function parentUpdatesForStudents(studentIds: number[]): Promise<ParentUpdateListItem[]> {
  if (studentIds.length === 0) return [];
  return db
    .select({
      update: parentUpdates,
      studentName: students.name,
      studentNickname: students.nickname,
      studentColor: students.color,
    })
    .from(parentUpdates)
    .innerJoin(students, eq(students.id, parentUpdates.studentId))
    .where(and(inArray(parentUpdates.studentId, studentIds), ne(parentUpdates.status, "draft")))
    .orderBy(desc(parentUpdates.periodEnd), desc(parentUpdates.id))
    .limit(100);
}

export async function getParentUpdateForParent(
  studentIds: number[],
  updateId: number,
): Promise<ParentUpdate | null> {
  if (studentIds.length === 0) return null;
  const rows = await db
    .select()
    .from(parentUpdates)
    .where(
      and(
        eq(parentUpdates.id, updateId),
        inArray(parentUpdates.studentId, studentIds),
        ne(parentUpdates.status, "draft"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/* ------------------------- Sumber data untuk laporan ------------------------ */

export type ParentUpdateSource = {
  studentName: string;
  periodLabel: string;
  programNames: string[];
  sessionCount: number;
  attendedCount: number;
  topics: string[];
  assignmentResults: { title: string; score: number; maxScore: number }[];
  latestNotes: string[];
};

/** Mengumpulkan seluruh data periode dari Lesson Session (source of truth). */
export async function parentUpdateSource(
  tutorId: number,
  studentId: number,
  periodStart: string,
  periodEnd: string,
): Promise<ParentUpdateSource> {
  await assertStudentOwned(tutorId, studentId);

  const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (!student) throw new ReportError("Murid tidak ditemukan.");

  const sessions = await db
    .select({
      topicLabel: lessonSessions.topicLabel,
      reportText: lessonSessions.reportText,
      attendance: lessonSessions.attendance,
      status: lessonSessions.status,
    })
    .from(lessonSessions)
    .where(
      and(
        eq(lessonSessions.studentId, studentId),
        gte(lessonSessions.date, periodStart),
        lte(lessonSessions.date, periodEnd),
      ),
    )
    .orderBy(asc(lessonSessions.date));

  const completed = sessions.filter((session) => session.status === "completed");

  const programRows = await db
    .select({ name: programs.name })
    .from(programs)
    .where(eq(programs.studentId, studentId));

  const attempts = await db
    .select({
      title: assignments.title,
      score: assignmentAttempts.score,
      maxScore: assignmentAttempts.maxScore,
      gradedAt: assignmentAttempts.gradedAt,
      submittedAt: assignmentAttempts.submittedAt,
    })
    .from(assignmentAttempts)
    .innerJoin(assignments, eq(assignments.id, assignmentAttempts.assignmentId))
    .where(and(eq(assignmentAttempts.studentId, studentId), eq(assignmentAttempts.status, "graded")))
    .orderBy(desc(assignmentAttempts.id))
    .limit(20);

  const periodStartDate = new Date(`${periodStart}T00:00:00`);
  const periodEndDate = new Date(`${periodEnd}T23:59:59`);

  const inPeriod = attempts.filter((attempt) => {
    const when = attempt.gradedAt ?? attempt.submittedAt;
    return when !== null && when >= periodStartDate && when <= periodEndDate;
  });

  const topics = [...new Set(completed.map((session) => session.topicLabel).filter((v): v is string => Boolean(v)))];

  return {
    studentName: student.nickname || student.name,
    periodLabel: `${formatDateShort(periodStart)} – ${formatDateShort(periodEnd)}`,
    programNames: programRows.map((row) => row.name),
    sessionCount: sessions.length,
    attendedCount: completed.filter((session) => session.attendance === "present").length,
    topics,
    assignmentResults: inPeriod.map((attempt) => ({
      title: attempt.title,
      score: attempt.score ?? 0,
      maxScore: attempt.maxScore,
    })),
    latestNotes: completed
      .map((session) => session.reportText)
      .filter((note): note is string => Boolean(note && note.trim()))
      .slice(-5),
  };
}

/** Menandai laporan sudah dikirim dan memberi tahu orang tua yang tersambung. */
export async function markParentUpdateSent(tutorId: number, updateId: number): Promise<ParentUpdate> {
  const update = await getOwnedParentUpdate(tutorId, updateId);
  await db
    .update(parentUpdates)
    .set({ status: "sent", sentAt: update.sentAt ?? new Date() })
    .where(eq(parentUpdates.id, updateId));

  const links = await db
    .select({ parentUserId: parentStudents.parentUserId })
    .from(parentStudents)
    .where(eq(parentStudents.studentId, update.studentId));

  for (const link of links) {
    await pushNotification({
      userId: link.parentUserId,
      type: "info",
      title: `Rangkuman baru: ${update.title}`,
      body: `Periode ${formatDateShort(update.periodStart)} – ${formatDateShort(update.periodEnd)}`,
      link: `/parent/reports/${update.id}`,
      dedupeKey: `parent_update:${update.id}:${link.parentUserId}`,
    });
  }

  return getOwnedParentUpdate(tutorId, updateId);
}
