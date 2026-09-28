import "server-only";
import { and, desc, eq, like, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  assignmentAttempts,
  assignments,
  documents,
  invoices,
  lessonSessions,
  parentUpdates,
  programs,
  schedules,
  students,
} from "@/db/schema";
import { DAY_NAMES_ID, addMinutesToTime, formatCurrency, timeRangeLabel } from "@/lib/datetime";
import {
  DOCUMENT_CATEGORY_LABELS,
  INVOICE_STATUS_LABELS,
  UPDATE_KIND_LABELS,
  labelOf,
} from "@/lib/domain/labels";

/** Delapan kategori hasil pencarian sesuai dokumentasi §14. */
export type SearchResultGroup =
  | "students"
  | "programs"
  | "schedules"
  | "lessons"
  | "reports"
  | "invoices"
  | "attempts"
  | "documents";

export const SEARCH_GROUPS: SearchResultGroup[] = [
  "students",
  "programs",
  "schedules",
  "lessons",
  "reports",
  "invoices",
  "attempts",
  "documents",
];

export type SearchHit = {
  id: number;
  group: SearchResultGroup;
  title: string;
  subtitle: string | null;
  meta: string | null;
  href: string;
  studentName: string | null;
  studentColor: string | null;
};

export type SearchResults = {
  query: string;
  hits: SearchHit[];
  counts: Record<SearchResultGroup, number>;
};

const LIMIT_PER_GROUP = 8;

export async function searchEverything(tutorId: number, rawQuery: string): Promise<SearchResults> {
  const query = rawQuery.trim();
  const counts = Object.fromEntries(SEARCH_GROUPS.map((group) => [group, 0])) as Record<
    SearchResultGroup,
    number
  >;
  if (!query) return { query, hits: [], counts };

  const term = `%${query}%`;
  const owned = eq(students.tutorId, tutorId);
  /** Nama murid ikut dicari di tiap kategori supaya "Alliando" memunculkan seluruh bagiannya. */
  const studentMatched = or(
    like(students.name, term),
    like(students.nickname, term),
    like(students.school, term),
  ) as SQL;

  const [
    studentRows,
    programRows,
    scheduleRows,
    lessonRows,
    reportRows,
    invoiceRows,
    attemptRows,
    documentRows,
  ] = await Promise.all([
    db
      .select({
        id: students.id,
        name: students.name,
        nickname: students.nickname,
        school: students.school,
        grade: students.grade,
        color: students.color,
        parentName: students.parentName,
      })
      .from(students)
      .where(
        and(
          owned,
          or(
            like(students.name, term),
            like(students.nickname, term),
            like(students.school, term),
            like(students.parentName, term),
          ) as SQL,
        ),
      )
      .orderBy(students.name)
      .limit(LIMIT_PER_GROUP),

    db
      .select({
        id: programs.id,
        name: programs.name,
        subject: programs.subject,
        rate: programs.rate,
        isActive: programs.isActive,
        studentId: students.id,
        studentName: students.name,
        studentColor: students.color,
      })
      .from(programs)
      .innerJoin(students, eq(students.id, programs.studentId))
      .where(and(owned, or(studentMatched, like(programs.name, term), like(programs.subject, term)) as SQL))
      .orderBy(students.name, programs.name)
      .limit(LIMIT_PER_GROUP),

    db
      .select({
        id: schedules.id,
        dayOfWeek: schedules.dayOfWeek,
        startTime: schedules.startTime,
        durationMinutes: schedules.durationMinutes,
        location: schedules.location,
        programName: programs.name,
        studentId: students.id,
        studentName: students.name,
        studentColor: students.color,
      })
      .from(schedules)
      .innerJoin(students, eq(students.id, schedules.studentId))
      .leftJoin(programs, eq(programs.id, schedules.programId))
      .where(
        and(
          owned,
          eq(schedules.isActive, true),
          or(studentMatched, like(programs.name, term), like(schedules.location, term)) as SQL,
        ),
      )
      .orderBy(students.name, schedules.dayOfWeek, schedules.startTime)
      .limit(LIMIT_PER_GROUP),

    db
      .select({
        id: lessonSessions.id,
        date: lessonSessions.date,
        topicLabel: lessonSessions.topicLabel,
        material: lessonSessions.material,
        studentId: students.id,
        studentName: students.name,
        studentColor: students.color,
        programName: programs.name,
      })
      .from(lessonSessions)
      .innerJoin(students, eq(students.id, lessonSessions.studentId))
      .leftJoin(programs, eq(programs.id, lessonSessions.programId))
      .where(
        and(
          owned,
          or(
            studentMatched,
            like(lessonSessions.topicLabel, term),
            like(lessonSessions.material, term),
            like(lessonSessions.activities, term),
            like(lessonSessions.reportText, term),
          ) as SQL,
        ),
      )
      .orderBy(desc(lessonSessions.date))
      .limit(LIMIT_PER_GROUP),

    db
      .select({
        id: parentUpdates.id,
        title: parentUpdates.title,
        kind: parentUpdates.kind,
        periodStart: parentUpdates.periodStart,
        periodEnd: parentUpdates.periodEnd,
        studentId: students.id,
        studentName: students.name,
        studentColor: students.color,
      })
      .from(parentUpdates)
      .innerJoin(students, eq(students.id, parentUpdates.studentId))
      .where(and(owned, or(studentMatched, like(parentUpdates.title, term), like(parentUpdates.body, term)) as SQL))
      .orderBy(desc(parentUpdates.periodEnd), desc(parentUpdates.id))
      .limit(LIMIT_PER_GROUP),

    db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        issueDate: invoices.issueDate,
        studentId: students.id,
        studentName: students.name,
        studentColor: students.color,
      })
      .from(invoices)
      .innerJoin(students, eq(students.id, invoices.studentId))
      .where(and(owned, or(studentMatched, like(invoices.invoiceNumber, term)) as SQL))
      .orderBy(desc(invoices.issueDate), desc(invoices.id))
      .limit(LIMIT_PER_GROUP),

    db
      .select({
        id: assignmentAttempts.id,
        assignmentId: assignments.id,
        title: assignments.title,
        material: assignments.material,
        score: assignmentAttempts.score,
        maxScore: assignmentAttempts.maxScore,
        programName: programs.name,
        studentId: students.id,
        studentName: students.name,
        studentColor: students.color,
      })
      .from(assignmentAttempts)
      .innerJoin(assignments, eq(assignments.id, assignmentAttempts.assignmentId))
      .innerJoin(students, eq(students.id, assignmentAttempts.studentId))
      .leftJoin(programs, eq(programs.id, assignments.programId))
      .where(
        and(
          owned,
          eq(assignmentAttempts.status, "graded"),
          or(studentMatched, like(assignments.title, term), like(assignments.material, term)) as SQL,
        ),
      )
      .orderBy(desc(assignmentAttempts.id))
      .limit(LIMIT_PER_GROUP),

    db
      .select({
        id: documents.id,
        title: documents.title,
        materialTag: documents.materialTag,
        category: documents.category,
        studentId: students.id,
        studentName: students.name,
        studentColor: students.color,
      })
      .from(documents)
      .leftJoin(students, eq(students.id, documents.studentId))
      .where(
        and(
          or(eq(documents.uploadedByUserId, tutorId), eq(students.tutorId, tutorId)) as SQL,
          or(studentMatched, like(documents.title, term), like(documents.materialTag, term), like(documents.originalName, term)) as SQL,
        ),
      )
      .orderBy(desc(documents.createdAt))
      .limit(LIMIT_PER_GROUP),
  ]);

  const hits: SearchHit[] = [
    ...studentRows.map((row) => ({
      id: row.id,
      group: "students" as const,
      title: row.nickname ? `${row.name} (${row.nickname})` : row.name,
      subtitle: [row.grade, row.school].filter(Boolean).join(" · ") || row.parentName || null,
      meta: null,
      href: `/students/${row.id}`,
      studentName: row.name,
      studentColor: row.color,
    })),
    ...programRows.map((row) => ({
      id: row.id,
      group: "programs" as const,
      title: row.name,
      subtitle: [row.subject, row.studentName].filter(Boolean).join(" · "),
      meta: row.isActive ? formatCurrency(row.rate) : "Nonaktif",
      href: `/students/${row.studentId}`,
      studentName: row.studentName,
      studentColor: row.studentColor,
    })),
    ...scheduleRows.map((row) => ({
      id: row.id,
      group: "schedules" as const,
      title: `${DAY_NAMES_ID[row.dayOfWeek] ?? "Hari"} · ${timeRangeLabel(
        row.startTime,
        addMinutesToTime(row.startTime, row.durationMinutes),
      )}`,
      subtitle: [row.programName, row.studentName].filter(Boolean).join(" · "),
      meta: row.location,
      href: `/schedule`,
      studentName: row.studentName,
      studentColor: row.studentColor,
    })),
    ...lessonRows.map((row) => ({
      id: row.id,
      group: "lessons" as const,
      title: row.topicLabel ?? row.material ?? "Sesi les",
      subtitle: [row.studentName, row.material && row.topicLabel ? row.material : row.programName]
        .filter(Boolean)
        .join(" · "),
      meta: row.date,
      href: `/lessons/${row.id}`,
      studentName: row.studentName,
      studentColor: row.studentColor,
    })),
    ...reportRows.map((row) => ({
      id: row.id,
      group: "reports" as const,
      title: row.title,
      subtitle: row.studentName,
      meta: labelOf(UPDATE_KIND_LABELS, row.kind),
      href: `/reports/${row.id}`,
      studentName: row.studentName,
      studentColor: row.studentColor,
    })),
    ...invoiceRows.map((row) => ({
      id: row.id,
      group: "invoices" as const,
      title: row.invoiceNumber,
      subtitle: row.studentName,
      meta: labelOf(INVOICE_STATUS_LABELS, row.status),
      href: `/invoices/${row.id}`,
      studentName: row.studentName,
      studentColor: row.studentColor,
    })),
    ...attemptRows.map((row) => ({
      id: row.id,
      group: "attempts" as const,
      title: row.title,
      subtitle: [row.programName, row.studentName].filter(Boolean).join(" · "),
      meta: row.score === null ? "Belum dinilai" : `${row.score}/${row.maxScore}`,
      href: `/assignments/${row.assignmentId}`,
      studentName: row.studentName,
      studentColor: row.studentColor,
    })),
    ...documentRows.map((row) => ({
      id: row.id,
      group: "documents" as const,
      title: row.title,
      subtitle: [row.materialTag ?? row.category, row.studentName].filter(Boolean).join(" · "),
      meta: labelOf(DOCUMENT_CATEGORY_LABELS, row.category),
      href: `/documents`,
      studentName: row.studentName,
      studentColor: row.studentColor,
    })),
  ];

  const resultCounts = {
    students: studentRows.length,
    programs: programRows.length,
    schedules: scheduleRows.length,
    lessons: lessonRows.length,
    reports: reportRows.length,
    invoices: invoiceRows.length,
    attempts: attemptRows.length,
    documents: documentRows.length,
  };

  return { query, hits, counts: resultCounts };
}
