import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { lessonSessions, schedules, students, type LessonSession } from "@/db/schema";
import { addDays, addMinutesToTime, formatDateShort, toSqlTime, todayKey } from "@/lib/datetime";
import { expandAll, type ScheduleTemplate } from "@/lib/domain/schedule";
import { notifyParents } from "@/lib/services/notifications";

export class LessonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LessonError";
  }
}

const toTemplate = (row: typeof schedules.$inferSelect): ScheduleTemplate => ({
  id: row.id,
  dayOfWeek: row.dayOfWeek,
  startTime: row.startTime,
  durationMinutes: row.durationMinutes,
  frequency: row.frequency,
  startDate: row.startDate,
  endDate: row.endDate,
  isActive: row.isActive,
});

/**
 * Membuat baris pertemuan konkret dari jadwal rutin. Idempotent karena
 * unique index (schedule_id, date, start_time) + insert ignore.
 */
export async function ensureSessionsForRange(tutorId: number, rangeStart: string, rangeEnd: string): Promise<number> {
  const rows = await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.isActive, true),
        lte(schedules.startDate, rangeEnd),
        or(isNull(schedules.endDate), gte(schedules.endDate, rangeStart)),
      ),
    );

  if (rows.length === 0) return 0;

  const ownedStudentIds = new Set(
    (await db.select({ id: students.id }).from(students).where(eq(students.tutorId, tutorId))).map((r) => r.id),
  );

  const relevant = rows.filter((r) => ownedStudentIds.has(r.studentId));
  if (relevant.length === 0) return 0;

  const occurrences = expandAll(relevant.map(toTemplate), rangeStart, rangeEnd);
  if (occurrences.length === 0) return 0;

  const bySchedule = new Map(relevant.map((r) => [r.id, r]));
  const values = occurrences.flatMap((occ) => {
    const template = bySchedule.get(occ.scheduleId);
    if (!template) return [];
    return [
      {
        studentId: template.studentId,
        programId: template.programId,
        scheduleId: template.id,
        tutorId,
        date: occ.date,
        startTime: occ.startTime,
        endTime: occ.endTime,
        durationMinutes: occ.durationMinutes,
        status: "scheduled" as const,
      },
    ];
  });
  if (values.length === 0) return 0;

  let inserted = 0;
  const CHUNK = 200;
  for (let i = 0; i < values.length; i += CHUNK) {
    // onDuplicateKeyUpdate no-op: bentrok dengan unique slot (schedule, date, start_time) diabaikan.
    const result = await db
      .insert(lessonSessions)
      .values(values.slice(i, i + CHUNK))
      .onDuplicateKeyUpdate({ set: { durationMinutes: sql`${lessonSessions.durationMinutes}` } });
    inserted += Number(result[0]?.affectedRows ?? 0);
  }
  return inserted;
}

export async function ensureSessionsAround(tutorId: number, days = 60): Promise<number> {
  const today = todayKey();
  return ensureSessionsForRange(tutorId, addDays(today, -days), addDays(today, days));
}

const slotKey = (date: string, startTime: string) => `${date.slice(0, 10)}|${startTime.slice(0, 5)}`;

/**
 * Menghapus pertemuan terjadwal ke depan yang tidak lagi dihasilkan jadwal rutin —
 * misalnya setelah hari, jam, durasi, atau tanggal jadwal diubah. Tanpa ini, sesi
 * dari slot lama ikut ter-render sebagai pertemuan ganda. Pertemuan yang sudah
 * selesai, dibatalkan, dipindah, atau lewat tidak disentuh begitu juga jadwal nonaktif.
 */
export async function pruneStaleSessions(scheduleId: number): Promise<number> {
  const [schedule] = await db.select().from(schedules).where(eq(schedules.id, scheduleId)).limit(1);
  if (!schedule || !schedule.isActive) return 0;

  const today = todayKey();
  const candidates = await db
    .select({ id: lessonSessions.id, date: lessonSessions.date, startTime: lessonSessions.startTime })
    .from(lessonSessions)
    .where(
      and(
        eq(lessonSessions.scheduleId, scheduleId),
        eq(lessonSessions.status, "scheduled"),
        gte(lessonSessions.date, today),
      ),
    );

  if (candidates.length === 0) return 0;

  const horizon = candidates.reduce((max, row) => (row.date > max ? row.date : max), today);
  const keep = new Set(
    expandAll([toTemplate(schedule)], today, horizon).map((occ) => slotKey(occ.date, occ.startTime)),
  );

  const staleIds = candidates.filter((row) => !keep.has(slotKey(row.date, row.startTime))).map((row) => row.id);
  if (staleIds.length === 0) return 0;

  await db.delete(lessonSessions).where(inArray(lessonSessions.id, staleIds));
  return staleIds.length;
}

export type CompleteLessonInput = {
  lessonId: number;
  attendance: "present" | "absent";
  focus: LessonSession["focus"];
  topicLabel?: string | null;
  material?: string | null;
  activities?: string | null;
  notes?: string | null;
  reportText?: string | null;
  reportGeneratedBy?: "manual" | "ai" | null;
  actualDurationMinutes?: number;
  isBillable?: boolean;
};

/** Selesai Mengajar: menandai pertemuan selesai + menulis laporan (sumber kebenaran). */
export async function completeLesson(tutorId: number, input: CompleteLessonInput): Promise<LessonSession> {
  const existing = await getOwnedLesson(tutorId, input.lessonId);
  if (existing.status === "completed") throw new LessonError("Pertemuan ini sudah diselesaikan.");

  const absent = input.attendance === "absent";
  const duration = clampDuration(input.actualDurationMinutes ?? existing.durationMinutes);
  const endTime = addMinutesToTime(existing.startTime, duration) + ":00";
  const reportText = input.reportText?.trim() ?? "";
  const reportStatus = reportText.length > 0 ? ("final" as const) : ("none" as const);

  // Tidak hadir = tidak ada materi yang diajarkan: field materi/aktivitas dipaksa kosong
  // di server (bukan cuma disembunyikan di form) supaya data selalu konsisten dengan status
  // kehadirannya, apa pun yang dikirim client. `reportText` dipakai ulang sebagai alasan
  // tidak hadir — field yang sama yang tampil ke orang tua sebagai "Laporan pertemuan".
  await db
    .update(lessonSessions)
    .set({
      status: absent ? "cancelled" : "completed",
      attendance: input.attendance,
      cancelReason: absent ? "student_absent" : null,
      isBillable: absent ? false : (input.isBillable ?? true),
      focus: absent ? "routine" : input.focus,
      topicLabel: absent ? null : emptyToNull(input.topicLabel),
      material: absent ? null : emptyToNull(input.material),
      activities: absent ? null : emptyToNull(input.activities),
      notes: absent ? null : emptyToNull(input.notes),
      reportText: reportText || null,
      reportStatus,
      reportGeneratedBy: reportText ? (input.reportGeneratedBy ?? "manual") : null,
      durationMinutes: duration,
      endTime,
      completedAt: new Date(),
    })
    .where(eq(lessonSessions.id, input.lessonId));

  return getOwnedLesson(tutorId, input.lessonId);
}

/**
 * Undo "Selesai Mengajar" saat tutor salah pilih pertemuan. Hanya berlaku untuk hasil
 * dari flow itu sendiri (completed, atau cancelled akibat "tidak hadir") — pembatalan
 * eksplisit lewat dialog "Batalkan" punya alasan lain dan tidak disentuh di sini.
 * Pertemuan yang sudah tertagih di invoice dikunci agar total invoice tetap akurat.
 */
export async function reopenLesson(tutorId: number, lessonId: number): Promise<LessonSession> {
  const existing = await getOwnedLesson(tutorId, lessonId);
  const fromCompleteFlow =
    existing.status === "completed" || (existing.status === "cancelled" && existing.cancelReason === "student_absent");
  if (!fromCompleteFlow) {
    throw new LessonError("Hanya pertemuan yang sudah ditandai selesai yang bisa dibalikkan ke terjadwal.");
  }
  if (existing.invoiceId) {
    throw new LessonError("Pertemuan ini sudah tertagih di invoice. Batalkan atau hapus invoice-nya dulu.");
  }

  await db
    .update(lessonSessions)
    .set({
      status: "scheduled",
      attendance: "present",
      cancelReason: null,
      isBillable: true,
      completedAt: null,
      focus: "routine",
      topicLabel: null,
      material: null,
      activities: null,
      notes: null,
      reportText: null,
      reportStatus: "none",
      reportGeneratedBy: null,
    })
    .where(eq(lessonSessions.id, lessonId));

  return getOwnedLesson(tutorId, lessonId);
}

export type LessonReportInput = {
  lessonId: number;
  focus: LessonSession["focus"];
  topicLabel?: string | null;
  material?: string | null;
  activities?: string | null;
  notes?: string | null;
  reportText?: string | null;
  reportStatus: "none" | "draft" | "final";
  reportGeneratedBy?: "manual" | "ai" | null;
};

/** Menyimpan atau memperbarui laporan tanpa mengubah status kehadiran pertemuan. */
export async function updateLessonReport(tutorId: number, input: LessonReportInput): Promise<LessonSession> {
  const existing = await getOwnedLesson(tutorId, input.lessonId);
  if (existing.status === "cancelled" || existing.status === "moved") {
    throw new LessonError("Pertemuan ini tidak bisa diberi laporan.");
  }

  const reportText = input.reportText?.trim() ?? "";
  const reportStatus = reportText.length === 0 ? ("none" as const) : input.reportStatus === "none" ? ("draft" as const) : input.reportStatus;

  await db
    .update(lessonSessions)
    .set({
      focus: input.focus,
      topicLabel: emptyToNull(input.topicLabel),
      material: emptyToNull(input.material),
      activities: emptyToNull(input.activities),
      notes: emptyToNull(input.notes),
      reportText: reportText || null,
      reportStatus,
      reportGeneratedBy: reportText ? (input.reportGeneratedBy ?? "manual") : null,
    })
    .where(eq(lessonSessions.id, input.lessonId));

  return getOwnedLesson(tutorId, input.lessonId);
}

export async function cancelLesson(
  tutorId: number,
  lessonId: number,
  reason: LessonSession["cancelReason"],
  note?: string,
): Promise<void> {
  const lesson = await getOwnedLesson(tutorId, lessonId);
  await db
    .update(lessonSessions)
    .set({ status: "cancelled", cancelReason: reason ?? "cancelled", isBillable: false, notes: emptyToNull(note) })
    .where(eq(lessonSessions.id, lessonId));

  const [student] = await db
    .select({ name: students.name, nickname: students.nickname })
    .from(students)
    .where(eq(students.id, lesson.studentId))
    .limit(1);
  const label = student?.nickname || student?.name || "Anak Anda";

  await notifyParents(lesson.studentId, {
    type: "info",
    title: `Pertemuan ${label} dibatalkan`,
    body: `Jadwal ${formatDateShort(lesson.date)} pukul ${lesson.startTime.slice(0, 5)} dibatalkan pengajar.`,
    link: "/parent/schedule",
    dedupeKey: `parent_cancel:${lessonId}`,
  });
}

/** Pindahkan jadwal: pertemuan lama ditandai `moved`, dibuat pertemuan baru tertaut. */
export async function rescheduleLesson(
  tutorId: number,
  lessonId: number,
  newDate: string,
  newStartTime: string,
): Promise<LessonSession> {
  const source = await getOwnedLesson(tutorId, lessonId);
  if (source.status === "completed") throw new LessonError("Pertemuan yang sudah selesai tidak bisa dipindahkan.");

  const duration = source.durationMinutes;
  const [created] = await db
    .insert(lessonSessions)
    .values({
      studentId: source.studentId,
      programId: source.programId,
      tutorId,
      date: newDate,
      startTime: toSqlTime(newStartTime),
      endTime: addMinutesToTime(newStartTime, duration) + ":00",
      durationMinutes: duration,
      status: "scheduled",
      focus: source.focus,
      topicLabel: source.topicLabel,
      notes: source.notes,
      movedFromId: source.id,
    })
    .$returningId();

  await db.update(lessonSessions).set({ status: "moved", movedToId: created.id }).where(eq(lessonSessions.id, source.id));

  const [student] = await db
    .select({ name: students.name, nickname: students.nickname })
    .from(students)
    .where(eq(students.id, source.studentId))
    .limit(1);
  const label = student?.nickname || student?.name || "Anak Anda";

  await notifyParents(source.studentId, {
    type: "info",
    title: `Jadwal ${label} dipindahkan`,
    body: `Dari ${formatDateShort(source.date)} ke ${formatDateShort(newDate)} pukul ${newStartTime.slice(0, 5)}.`,
    link: "/parent/schedule",
    dedupeKey: `parent_reschedule:${created.id}`,
  });

  return getOwnedLesson(tutorId, created.id);
}

export type ExtraSessionInput = {
  studentId: number;
  programId: number;
  date: string;
  startTime: string;
  durationMinutes: number;
  notes?: string | null;
};

/** Pertemuan tambahan di luar jadwal rutin (scheduleId null). */
export async function createExtraSession(tutorId: number, input: ExtraSessionInput): Promise<LessonSession> {
  const duration = clampDuration(input.durationMinutes);
  const [created] = await db
    .insert(lessonSessions)
    .values({
      studentId: input.studentId,
      programId: input.programId,
      tutorId,
      date: input.date,
      startTime: toSqlTime(input.startTime),
      endTime: addMinutesToTime(input.startTime, duration) + ":00",
      durationMinutes: duration,
      status: "scheduled",
      notes: emptyToNull(input.notes),
    })
    .$returningId();
  return getOwnedLesson(tutorId, created.id);
}

export async function deleteScheduledLesson(tutorId: number, lessonId: number): Promise<void> {
  const lesson = await getOwnedLesson(tutorId, lessonId);
  if (lesson.status === "completed") throw new LessonError("Pertemuan selesai tidak bisa dihapus.");
  await db.delete(lessonSessions).where(eq(lessonSessions.id, lessonId));
}

export async function getOwnedLesson(tutorId: number, lessonId: number): Promise<LessonSession> {
  const rows = await db
    .select()
    .from(lessonSessions)
    .where(and(eq(lessonSessions.id, lessonId), eq(lessonSessions.tutorId, tutorId)))
    .limit(1);
  const lesson = rows[0];
  if (!lesson) throw new LessonError("Pertemuan tidak ditemukan.");
  return lesson;
}

export async function lessonsBetween(tutorId: number, from: string, to: string): Promise<LessonSession[]> {
  return db
    .select()
    .from(lessonSessions)
    .where(and(eq(lessonSessions.tutorId, tutorId), gte(lessonSessions.date, from), lte(lessonSessions.date, to)))
    .orderBy(asc(lessonSessions.date), asc(lessonSessions.startTime));
}

/** Rentang tanggal untuk sekumpulan murid, urut maju. Dipakai halaman orang tua. */
export async function lessonsForStudentsBetween(
  studentIds: number[],
  from: string,
  to: string,
): Promise<LessonSession[]> {
  if (studentIds.length === 0) return [];
  return db
    .select()
    .from(lessonSessions)
    .where(
      and(
        inArray(lessonSessions.studentId, studentIds),
        gte(lessonSessions.date, from),
        lte(lessonSessions.date, to),
      ),
    )
    .orderBy(asc(lessonSessions.date), asc(lessonSessions.startTime));
}

/** Satu pertemuan milik salah satu murid yang boleh dilihat user. */
export async function lessonForStudents(studentIds: number[], lessonId: number): Promise<LessonSession | null> {
  if (studentIds.length === 0) return null;
  const rows = await db
    .select()
    .from(lessonSessions)
    .where(and(eq(lessonSessions.id, lessonId), inArray(lessonSessions.studentId, studentIds)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Riwayat untuk ditampilkan ke user: dibatasi sampai hari ini agar tidak kalah
 * rebutan slot `limit` melawan pertemuan mendatang yang di-generate otomatis
 * 60 hari ke depan (lihat ensureSessionsAround) — jadwal mendatang sudah punya
 * tempatnya sendiri (kartu "Pertemuan berikutnya"). Baris `moved` cuma penanda
 * jadwal lama, bukan pertemuan tersendiri, jadi ikut dibuang.
 */
export async function lessonsForStudent(studentId: number, limit = 50): Promise<LessonSession[]> {
  return db
    .select()
    .from(lessonSessions)
    .where(
      and(
        eq(lessonSessions.studentId, studentId),
        ne(lessonSessions.status, "moved"),
        lte(lessonSessions.date, todayKey()),
      ),
    )
    .orderBy(desc(lessonSessions.date), desc(lessonSessions.startTime))
    .limit(limit);
}

export async function pendingReportCount(tutorId: number): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(lessonSessions)
    .where(
      and(
        eq(lessonSessions.tutorId, tutorId),
        eq(lessonSessions.status, "completed"),
        or(eq(lessonSessions.reportStatus, "none"), and(ne(lessonSessions.attendance, "absent"), isNull(lessonSessions.reportText))),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

function clampDuration(minutes: number): number {
  if (!Number.isFinite(minutes)) return 60;
  return Math.min(600, Math.max(5, Math.round(minutes)));
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
