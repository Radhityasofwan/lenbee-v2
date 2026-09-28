import "server-only";
import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, lessonSessions, notifications, parentStudents, students } from "@/db/schema";
import { formatDateShort, todayKey } from "@/lib/datetime";
import { sendPushToUser } from "@/lib/services/push";

export type NotificationType = "lesson_today" | "report_pending" | "invoice_unpaid" | "assignment_submitted" | "info";

/**
 * Idempotent: dedupeKey unique per user mencegah baris notifikasi ganda.
 * Push (Web Push, level OS) hanya dikirim saat baris ini benar-benar baru —
 * sync ulang yang hanya me-refresh baris lama tidak mengirim push kedua kalinya.
 */
export async function pushNotification(input: {
  userId: number;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  dedupeKey: string;
}): Promise<void> {
  const [result] = await db
    .insert(notifications)
    .values(input)
    .onDuplicateKeyUpdate({ set: { title: input.title, body: input.body ?? null } });

  if (result.affectedRows === 1) {
    await sendPushToUser(input.userId, { title: input.title, body: input.body, url: input.link });
  }
}

/** Kirim satu notifikasi ke semua orang tua yang tersambung ke seorang anak. */
export async function notifyParents(
  studentId: number,
  input: { type: NotificationType; title: string; body?: string | null; link?: string | null; dedupeKey: string },
): Promise<void> {
  const links = await db
    .select({ parentUserId: parentStudents.parentUserId })
    .from(parentStudents)
    .where(eq(parentStudents.studentId, studentId));

  for (const link of links) {
    await pushNotification({ ...input, userId: link.parentUserId, dedupeKey: `${input.dedupeKey}:${link.parentUserId}` });
  }
}

export async function syncTutorNotifications(tutorId: number): Promise<void> {
  const today = todayKey();

  const todayLessons = await db
    .select({
      id: lessonSessions.id,
      startTime: lessonSessions.startTime,
      studentName: students.name,
      nickname: students.nickname,
    })
    .from(lessonSessions)
    .innerJoin(students, eq(students.id, lessonSessions.studentId))
    .where(and(eq(lessonSessions.tutorId, tutorId), eq(lessonSessions.date, today), eq(lessonSessions.status, "scheduled")));

  for (const lesson of todayLessons) {
    await pushNotification({
      userId: tutorId,
      type: "lesson_today",
      title: `Mengajar hari ini: ${lesson.nickname ?? lesson.studentName}`,
      body: `Pukul ${lesson.startTime.slice(0, 5)}`,
      link: `/lessons/${lesson.id}`,
      dedupeKey: `lesson_today:${lesson.id}`,
    });
  }

  const pendingReports = await db
    .select({ id: lessonSessions.id, date: lessonSessions.date, name: students.name })
    .from(lessonSessions)
    .innerJoin(students, eq(students.id, lessonSessions.studentId))
    .where(
      and(
        eq(lessonSessions.tutorId, tutorId),
        eq(lessonSessions.status, "completed"),
        eq(lessonSessions.attendance, "present"),
        sql`${lessonSessions.reportText} is null`,
        lte(lessonSessions.date, today),
      ),
    )
    .orderBy(desc(lessonSessions.date))
    .limit(20);

  for (const lesson of pendingReports) {
    await pushNotification({
      userId: tutorId,
      type: "report_pending",
      title: `Laporan belum diisi: ${lesson.name}`,
      body: `Pertemuan ${formatDateShort(lesson.date)}`,
      link: `/lessons/${lesson.id}`,
      dedupeKey: `report_pending:${lesson.id}`,
    });
  }

  const overdue = await db
    .select({ id: invoices.id, number: invoices.invoiceNumber, total: invoices.total, paidAmount: invoices.paidAmount })
    .from(invoices)
    .innerJoin(students, eq(students.id, invoices.studentId))
    .where(
      and(
        inArray(invoices.status, ["unpaid", "partial"]),
        lte(invoices.issueDate, today),
        eq(students.tutorId, tutorId),
      ),
    )
    .limit(20);

  for (const invoice of overdue) {
    const remaining = Math.max(0, invoice.total - invoice.paidAmount);
    await pushNotification({
      userId: tutorId,
      type: "invoice_unpaid",
      title: `Invoice belum dibayar: ${invoice.number}`,
      body: `Sisa Rp${remaining.toLocaleString("id-ID")}`,
      link: `/invoices/${invoice.id}`,
      dedupeKey: `invoice_unpaid:${invoice.id}`,
    });
  }
}

/** Notifikasi untuk orang tua: 1 hari sebelum sesi. */
export async function syncParentNotifications(parentUserId: number): Promise<void> {
  const today = todayKey();
  const tomorrow = new Date(`${today}T00:00:00`);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = tomorrow.toISOString().slice(0, 10);

  const links = await db
    .select({ studentId: parentStudents.studentId })
    .from(parentStudents)
    .where(eq(parentStudents.parentUserId, parentUserId));
  if (links.length === 0) return;
  const studentIds = links.map((l) => l.studentId);

  const upcoming = await db
    .select({
      id: lessonSessions.id,
      startTime: lessonSessions.startTime,
      name: students.name,
      nickname: students.nickname,
    })
    .from(lessonSessions)
    .innerJoin(students, eq(students.id, lessonSessions.studentId))
    .where(
      and(
        inArray(lessonSessions.studentId, studentIds),
        eq(lessonSessions.date, tomorrowKey),
        eq(lessonSessions.status, "scheduled"),
      ),
    );

  for (const lesson of upcoming) {
    await pushNotification({
      userId: parentUserId,
      type: "lesson_today",
      title: `Besok ada sesi: ${lesson.nickname ?? lesson.name}`,
      body: `Pukul ${lesson.startTime.slice(0, 5)}`,
      link: `/parent`,
      dedupeKey: `parent_lesson:${lesson.id}`,
    });
  }

  const openInvoices = await db
    .select({
      id: invoices.id,
      number: invoices.invoiceNumber,
      total: invoices.total,
      paidAmount: invoices.paidAmount,
      name: students.name,
    })
    .from(invoices)
    .innerJoin(students, eq(students.id, invoices.studentId))
    .where(and(inArray(invoices.studentId, studentIds), inArray(invoices.status, ["unpaid", "partial"])));

  for (const invoice of openInvoices) {
    const remaining = Math.max(0, invoice.total - invoice.paidAmount);
    await pushNotification({
      userId: parentUserId,
      type: "invoice_unpaid",
      title: `Tagihan ${invoice.name} belum lunas`,
      body: `${invoice.number} — Rp${remaining.toLocaleString("id-ID")}`,
      link: "/parent",
      dedupeKey: `parent_invoice:${invoice.id}`,
    });
  }
}

/** Memberi tahu orang tua saat laporan sebuah pertemuan ditandai final. */
export async function notifyReportPublished(lessonId: number): Promise<void> {
  const rows = await db
    .select({ studentId: lessonSessions.studentId, date: lessonSessions.date, studentName: students.name, nickname: students.nickname })
    .from(lessonSessions)
    .innerJoin(students, eq(students.id, lessonSessions.studentId))
    .where(eq(lessonSessions.id, lessonId))
    .limit(1);
  const row = rows[0];
  if (!row) return;

  await notifyParents(row.studentId, {
    type: "info",
    title: `Laporan baru: ${row.nickname ?? row.studentName}`,
    body: `Pertemuan ${formatDateShort(row.date)}`,
    link: "/parent/reports",
    dedupeKey: `parent_report:${lessonId}`,
  });
}

export async function listNotifications(userId: number, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function unreadCount(userId: number): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false), gte(notifications.createdAt, new Date(Date.now() - 30 * 864e5))));
  return Number(rows[0]?.count ?? 0);
}

export async function markAllRead(userId: number): Promise<void> {
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

export async function markRead(userId: number, notificationId: number): Promise<void> {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}
