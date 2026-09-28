import "server-only";
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assignmentAttempts,
  assignments,
  invoices,
  lessonAttachments,
  lessonSessions,
  parentStudents,
  programs,
  students,
  type LessonSession,
} from "@/db/schema";
import { addDays, currentPeriodFor, endOfMonth, endOfWeek, startOfMonth, startOfWeek, todayKey } from "@/lib/datetime";
import { getOwnedLesson } from "./sessions";

export type TodayLesson = {
  lesson: LessonSession;
  studentName: string;
  studentNickname: string | null;
  studentColor: string;
  programName: string;
  reportStatus: LessonSession["reportStatus"];
};

export type TutorDashboard = {
  today: TodayLesson[];
  upcoming: TodayLesson[];
  stats: {
    studentsActive: number;
    lessonsThisWeek: number;
    lessonsThisMonth: number;
    completedThisMonth: number;
    cancelledThisMonth: number;
    pendingReports: number;
    revenueThisMonth: number;
    outstandingTotal: number;
    attendanceRate: number | null;
  };
  recentLessons: TodayLesson[];
  openInvoices: { id: number; invoiceNumber: string; studentName: string; total: number; status: string; dueDate: string | null }[];
  activeAssignments: number;
  studentsNeedingAttention: { id: number; name: string; nickname: string | null; color: string; daysSince: number | null }[];
};

export async function tutorDashboard(tutorId: number): Promise<TutorDashboard> {
  const today = todayKey();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const studentRows = await db
    .select()
    .from(students)
    .where(and(eq(students.tutorId, tutorId), eq(students.isActive, true)))
    .orderBy(asc(students.name));

  const studentIds = studentRows.map((s) => s.id);
  const studentById = new Map(studentRows.map((s) => [s.id, s]));

  const programRows = studentIds.length
    ? await db.select().from(programs).where(inArray(programs.studentId, studentIds))
    : [];
  const programById = new Map(programRows.map((p) => [p.id, p]));

  const decorate = (lesson: LessonSession, studentName: string, nickname: string | null): TodayLesson => ({
    lesson,
    studentName,
    studentNickname: nickname,
    studentColor: studentById.get(lesson.studentId)?.color ?? "violet",
    programName: programById.get(lesson.programId)?.name ?? "Program",
    reportStatus: lesson.reportStatus,
  });

  const base = db
    .select({
      lesson: lessonSessions,
      studentName: students.name,
      nickname: students.nickname,
    })
    .from(lessonSessions)
    .innerJoin(students, eq(students.id, lessonSessions.studentId));

  const todayRows = await base
    .where(
      and(
        eq(lessonSessions.tutorId, tutorId),
        eq(lessonSessions.date, today),
        sql`${lessonSessions.status} <> 'moved'`,
      ),
    )
    .orderBy(asc(lessonSessions.startTime));

  const upcomingRows = await db
    .select({
      lesson: lessonSessions,
      studentName: students.name,
      nickname: students.nickname,
    })
    .from(lessonSessions)
    .innerJoin(students, eq(students.id, lessonSessions.studentId))
    .where(
      and(
        eq(lessonSessions.tutorId, tutorId),
        eq(lessonSessions.status, "scheduled"),
        sql`${lessonSessions.date} > ${today}`,
        lte(lessonSessions.date, addDays(today, 14)),
      ),
    )
    .orderBy(asc(lessonSessions.date), asc(lessonSessions.startTime))
    .limit(12);

  const monthLessons = await db
    .select({
      id: lessonSessions.id,
      status: lessonSessions.status,
      attendance: lessonSessions.attendance,
      reportText: lessonSessions.reportText,
      studentId: lessonSessions.studentId,
    })
    .from(lessonSessions)
    .where(
      and(
        eq(lessonSessions.tutorId, tutorId),
        gte(lessonSessions.date, monthStart),
        lte(lessonSessions.date, monthEnd),
        sql`${lessonSessions.status} <> 'moved'`,
      ),
    );

  const weekRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(lessonSessions)
    .where(
      and(
        eq(lessonSessions.tutorId, tutorId),
        gte(lessonSessions.date, startOfWeek(today)),
        lte(lessonSessions.date, endOfWeek(today)),
        sql`${lessonSessions.status} <> 'cancelled'`,
        sql`${lessonSessions.status} <> 'moved'`,
      ),
    );

  const completed = monthLessons.filter((l) => l.status === "completed");
  const cancelled = monthLessons.filter((l) => l.status === "cancelled");
  const attended = completed.filter((l) => l.attendance === "present");
  const pendingReports = attended.filter((l) => !l.reportText).length;

  const revenueRows = studentIds.length
    ? await db
        .select({ total: sql<number>`coalesce(sum(${invoices.total}), 0)` })
        .from(invoices)
        .where(
          and(
            inArray(invoices.studentId, studentIds),
            gte(invoices.issueDate, monthStart),
            lte(invoices.issueDate, monthEnd),
            sql`${invoices.status} <> 'void'`,
          ),
        )
    : [{ total: 0 }];

  const outstandingRows = studentIds.length
    ? await db
        .select({ total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.paidAmount}), 0)` })
        .from(invoices)
        .where(and(inArray(invoices.studentId, studentIds), inArray(invoices.status, ["unpaid", "partial"])))
    : [{ total: 0 }];

  const recentRows = await db
    .select({
      lesson: lessonSessions,
      studentName: students.name,
      nickname: students.nickname,
    })
    .from(lessonSessions)
    .innerJoin(students, eq(students.id, lessonSessions.studentId))
    .where(and(eq(lessonSessions.tutorId, tutorId), eq(lessonSessions.status, "completed")))
    .orderBy(sql`${lessonSessions.date} desc`, sql`${lessonSessions.startTime} desc`)
    .limit(6);

  const openInvoiceRows = studentIds.length
    ? await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          studentName: students.name,
          total: invoices.total,
          status: invoices.status,
          dueDate: invoices.dueDate,
        })
        .from(invoices)
        .innerJoin(students, eq(students.id, invoices.studentId))
        .where(and(inArray(invoices.studentId, studentIds), inArray(invoices.status, ["unpaid", "partial"])))
        .orderBy(asc(invoices.dueDate))
        .limit(5)
    : [];

  const assignmentRows = studentIds.length
    ? await db
        .select({ count: sql<number>`count(*)` })
        .from(assignments)
        .where(and(inArray(assignments.studentId, studentIds), eq(assignments.status, "published")))
    : [{ count: 0 }];

  const lastLessonRows = studentIds.length
    ? await db
        .select({
          studentId: lessonSessions.studentId,
          lastDate: sql<string | null>`max(${lessonSessions.date})`,
        })
        .from(lessonSessions)
        .where(and(inArray(lessonSessions.studentId, studentIds), eq(lessonSessions.status, "completed")))
        .groupBy(lessonSessions.studentId)
    : [];
  const lastByStudent = new Map(lastLessonRows.map((r) => [r.studentId, r.lastDate]));

  const needingAttention = studentRows
    .map((s) => {
      const last = lastByStudent.get(s.id) ?? null;
      const daysSince = last ? Math.round((Date.parse(today) - Date.parse(last)) / 864e5) : null;
      return { id: s.id, name: s.name, nickname: s.nickname, color: s.color, daysSince };
    })
    .filter((s) => s.daysSince === null || s.daysSince > 14)
    .slice(0, 5);

  const attendanceRate =
    completed.length === 0 ? null : Math.round((attended.length / completed.length) * 100);

  return {
    today: todayRows.map((r) => decorate(r.lesson, r.studentName, r.nickname)),
    upcoming: upcomingRows.map((r) => decorate(r.lesson, r.studentName, r.nickname)),
    recentLessons: recentRows.map((r) => decorate(r.lesson, r.studentName, r.nickname)),
    stats: {
      studentsActive: studentRows.length,
      lessonsThisWeek: Number(weekRows[0]?.count ?? 0),
      lessonsThisMonth: monthLessons.length,
      completedThisMonth: completed.length,
      cancelledThisMonth: cancelled.length,
      pendingReports,
      revenueThisMonth: Number(revenueRows[0]?.total ?? 0),
      outstandingTotal: Number(outstandingRows[0]?.total ?? 0),
      attendanceRate,
    },
    openInvoices: openInvoiceRows,
    activeAssignments: Number(assignmentRows[0]?.count ?? 0),
    studentsNeedingAttention: needingAttention,
  };
}

export type StudentStats = {
  totalLessons: number;
  completedLessons: number;
  cancelledLessons: number;
  attendanceRate: number | null;
  totalMinutes: number;
  lastLessonDate: string | null;
  lessonsThisPeriod: number;
  periodStart: string;
  periodEnd: string;
  outstandingTotal: number;
  focusBreakdown: { focus: string; count: number }[];
};

/** `periodAnchor` = `students.periodStart` anak ini, dipakai supaya angka pertemuan cocok dengan periode invoice-nya. */
export async function studentStats(studentId: number, periodAnchor: string | null = null): Promise<StudentStats> {
  const today = todayKey();
  const { periodStart, periodEnd } = currentPeriodFor(periodAnchor, today);

  const rows = await db
    .select({
      status: lessonSessions.status,
      attendance: lessonSessions.attendance,
      durationMinutes: lessonSessions.durationMinutes,
      date: lessonSessions.date,
      focus: lessonSessions.focus,
    })
    .from(lessonSessions)
    .where(eq(lessonSessions.studentId, studentId));

  const completed = rows.filter((r) => r.status === "completed");
  const attended = completed.filter((r) => r.attendance === "present");
  const dates = completed.map((r) => r.date).sort();

  const focusMap = new Map<string, number>();
  for (const row of completed) focusMap.set(row.focus, (focusMap.get(row.focus) ?? 0) + 1);

  const outstanding = await db
    .select({ total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.paidAmount}), 0)` })
    .from(invoices)
    .where(and(eq(invoices.studentId, studentId), inArray(invoices.status, ["unpaid", "partial"])));

  return {
    totalLessons: rows.length,
    completedLessons: completed.length,
    cancelledLessons: rows.filter((r) => r.status === "cancelled").length,
    attendanceRate: completed.length === 0 ? null : Math.round((attended.length / completed.length) * 100),
    totalMinutes: attended.reduce((sum, r) => sum + r.durationMinutes, 0),
    lastLessonDate: dates.at(-1) ?? null,
    lessonsThisPeriod: rows.filter((r) => r.date >= periodStart && r.date <= periodEnd).length,
    periodStart,
    periodEnd,
    outstandingTotal: Number(outstanding[0]?.total ?? 0),
    focusBreakdown: [...focusMap.entries()].map(([focus, count]) => ({ focus, count })).sort((a, b) => b.count - a.count),
  };
}

export type ParentDashboard = {
  children: {
    studentId: number;
    name: string;
    nickname: string | null;
    color: string;
    grade: string | null;
    nextLesson: { id: number; date: string; startTime: string; programName: string } | null;
    lastReport: { id: number; date: string; text: string | null; topicLabel: string | null } | null;
    outstandingTotal: number;
    meetings: {
      completed: number;
      scheduled: number;
      cancelled: number;
      planned: number | null;
      periodStart: string;
      periodEnd: string;
    };
    lastLesson: { id: number; date: string; topic: string | null } | null;
    lastAttempt: { id: number; assignmentId: number; title: string; subject: string | null; score: number | null; maxScore: number } | null;
    lastPhoto: { id: number; storageKey: string; originalName: string; mimeType: string } | null;
  }[];
};

export async function parentDashboard(parentUserId: number): Promise<ParentDashboard> {
  const links = await db
    .select({ studentId: parentStudents.studentId })
    .from(parentStudents)
    .where(eq(parentStudents.parentUserId, parentUserId));

  if (links.length === 0) return { children: [] };
  const studentIds = links.map((l) => l.studentId);
  const today = todayKey();

  const studentRows = await db.select().from(students).where(inArray(students.id, studentIds));
  const children: ParentDashboard["children"] = [];

  for (const student of studentRows) {
    // Periode dijangkarkan ke tanggal mulai les anak (bukan tanggal 1 kalender) karena
    // tiap anak mulai les di tanggal berbeda dan ini jadi dasar hitungan invoice/fee.
    const { periodStart, periodEnd } = currentPeriodFor(student.periodStart, today);
    const nextRows = await db
      .select({
        id: lessonSessions.id,
        date: lessonSessions.date,
        startTime: lessonSessions.startTime,
        programName: programs.name,
      })
      .from(lessonSessions)
      .innerJoin(programs, eq(programs.id, lessonSessions.programId))
      .where(
        and(
          eq(lessonSessions.studentId, student.id),
          eq(lessonSessions.status, "scheduled"),
          gte(lessonSessions.date, today),
        ),
      )
      .orderBy(asc(lessonSessions.date), asc(lessonSessions.startTime))
      .limit(1);

    const reportRows = await db
      .select({
        id: lessonSessions.id,
        date: lessonSessions.date,
        text: lessonSessions.reportText,
        topicLabel: lessonSessions.topicLabel,
      })
      .from(lessonSessions)
      .where(
        and(
          eq(lessonSessions.studentId, student.id),
          sql`${lessonSessions.reportText} is not null`,
          eq(lessonSessions.reportStatus, "final"),
        ),
      )
      .orderBy(sql`${lessonSessions.date} desc`)
      .limit(1);

    const outstanding = await db
      .select({ total: sql<number>`coalesce(sum(${invoices.total} - ${invoices.paidAmount}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.studentId, student.id), inArray(invoices.status, ["unpaid", "partial"])));

    // `moved` sengaja ikut terhitung sebagai status tersendiri lalu dibuang: baris itu
    // tombstone pengganti jadwal lama, bukan pertemuan periode ini.
    const meetingRows = await db
      .select({ status: lessonSessions.status, count: sql<number>`count(*)` })
      .from(lessonSessions)
      .where(
        and(
          eq(lessonSessions.studentId, student.id),
          gte(lessonSessions.date, periodStart),
          lte(lessonSessions.date, periodEnd),
        ),
      )
      .groupBy(lessonSessions.status);

    const meetingByStatus = new Map(meetingRows.map((row) => [row.status, Number(row.count ?? 0)]));

    const plannedRows = await db
      .select({ total: sql<number>`coalesce(sum(${programs.sessionsPerMonth}), 0)` })
      .from(programs)
      .where(and(eq(programs.studentId, student.id), eq(programs.isActive, true)));

    const lastLessonRows = await db
      .select({
        id: lessonSessions.id,
        date: lessonSessions.date,
        topicLabel: lessonSessions.topicLabel,
        material: lessonSessions.material,
      })
      .from(lessonSessions)
      .where(and(eq(lessonSessions.studentId, student.id), eq(lessonSessions.status, "completed")))
      .orderBy(desc(lessonSessions.date), desc(lessonSessions.startTime))
      .limit(1);

    const attemptRows = await db
      .select({
        id: assignmentAttempts.id,
        assignmentId: assignments.id,
        title: assignments.title,
        subject: programs.subject,
        programName: programs.name,
        score: assignmentAttempts.score,
        maxScore: assignmentAttempts.maxScore,
      })
      .from(assignmentAttempts)
      .innerJoin(assignments, eq(assignments.id, assignmentAttempts.assignmentId))
      .leftJoin(programs, eq(programs.id, assignments.programId))
      .where(and(eq(assignmentAttempts.studentId, student.id), eq(assignmentAttempts.status, "graded")))
      .orderBy(desc(assignmentAttempts.id))
      .limit(1);

    const photoRows = await db
      .select({
        id: lessonAttachments.id,
        storageKey: lessonAttachments.storageKey,
        originalName: lessonAttachments.originalName,
        mimeType: lessonAttachments.mimeType,
      })
      .from(lessonAttachments)
      .innerJoin(lessonSessions, eq(lessonSessions.id, lessonAttachments.lessonId))
      .where(
        and(
          eq(lessonSessions.studentId, student.id),
          eq(lessonSessions.status, "completed"),
          eq(lessonAttachments.kind, "image"),
        ),
      )
      .orderBy(desc(lessonAttachments.id))
      .limit(1);

    const lastLessonRow = lastLessonRows[0];
    const attemptRow = attemptRows[0];
    const plannedTotal = Number(plannedRows[0]?.total ?? 0);

    children.push({
      studentId: student.id,
      name: student.name,
      nickname: student.nickname,
      color: student.color,
      grade: student.grade,
      nextLesson: nextRows[0] ?? null,
      lastReport: reportRows[0] ?? null,
      outstandingTotal: Number(outstanding[0]?.total ?? 0),
      meetings: {
        completed: meetingByStatus.get("completed") ?? 0,
        scheduled: meetingByStatus.get("scheduled") ?? 0,
        cancelled: meetingByStatus.get("cancelled") ?? 0,
        planned: plannedTotal > 0 ? plannedTotal : null,
        periodStart,
        periodEnd,
      },
      lastLesson: lastLessonRow
        ? {
            id: lastLessonRow.id,
            date: lastLessonRow.date,
            topic: lastLessonRow.topicLabel ?? lastLessonRow.material,
          }
        : null,
      lastAttempt: attemptRow
        ? {
            id: attemptRow.id,
            assignmentId: attemptRow.assignmentId,
            title: attemptRow.title,
            subject: attemptRow.subject ?? attemptRow.programName,
            score: attemptRow.score,
            maxScore: attemptRow.maxScore,
          }
        : null,
      lastPhoto: photoRows[0] ?? null,
    });
  }

  return { children };
}

export async function nextLessonFor(studentId: number): Promise<LessonSession | null> {
  const rows = await db
    .select()
    .from(lessonSessions)
    .where(and(eq(lessonSessions.studentId, studentId), gte(lessonSessions.date, todayKey())))
    .orderBy(asc(lessonSessions.date), asc(lessonSessions.startTime))
    .limit(1);
  return rows[0] ?? null;
}

export { getOwnedLesson };
