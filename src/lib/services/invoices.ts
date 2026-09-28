import "server-only";
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { invoiceItems, invoices, lessonSessions, programs, students, type Invoice } from "@/db/schema";
import { addDays, formatCurrency, formatDateShort, todayKey } from "@/lib/datetime";
import { buildInvoiceDraft, invoiceNumberFor, paymentStatusFor, type BillableLesson } from "@/lib/domain/invoice";
import { notifyParents } from "@/lib/services/notifications";

export class InvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceError";
  }
}

export type UnbilledPreview = {
  lessons: BillableLesson[];
  draft: ReturnType<typeof buildInvoiceDraft>;
};

/** Pertemuan selesai, billable, dan belum masuk invoice mana pun pada periode tsb. */
export async function unbilledLessons(studentId: number, periodStart: string, periodEnd: string): Promise<BillableLesson[]> {
  const rows = await db
    .select({
      lessonId: lessonSessions.id,
      programId: lessonSessions.programId,
      programName: programs.name,
      date: lessonSessions.date,
      durationMinutes: lessonSessions.durationMinutes,
      rate: programs.rate,
      rateUnit: programs.rateUnit,
    })
    .from(lessonSessions)
    .innerJoin(programs, eq(programs.id, lessonSessions.programId))
    .where(
      and(
        eq(lessonSessions.studentId, studentId),
        eq(lessonSessions.status, "completed"),
        eq(lessonSessions.isBillable, true),
        isNull(lessonSessions.invoiceId),
        gte(lessonSessions.date, periodStart),
        lte(lessonSessions.date, periodEnd),
      ),
    )
    .orderBy(asc(lessonSessions.date));
  return rows;
}

export async function previewInvoice(
  studentId: number,
  periodStart: string,
  periodEnd: string,
  discount = 0,
): Promise<UnbilledPreview> {
  const lessons = await unbilledLessons(studentId, periodStart, periodEnd);
  return { lessons, draft: buildInvoiceDraft(lessons, discount) };
}

export async function nextInvoiceNumber(dateKey: string = todayKey()): Promise<string> {
  const [year, month] = dateKey.split("-");
  const prefix = `INV/${year}${month}/`;
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(sql`${invoices.invoiceNumber} like ${prefix + "%"}`);
  const sequence = Number(rows[0]?.count ?? 0) + 1;
  return invoiceNumberFor(sequence, new Date(`${dateKey}T00:00:00`));
}

export type GenerateInvoiceInput = {
  studentId: number;
  periodStart: string;
  periodEnd: string;
  discount?: number;
  dueInDays?: number;
  notes?: string | null;
  createdByUserId: number;
};

/**
 * Session → Invoice. Mengambil pertemuan selesai yang belum ditagih, lalu
 * menautkannya ke invoice baru sehingga tidak mungkin tertagih dua kali.
 */
export async function generateInvoice(input: GenerateInvoiceInput): Promise<Invoice> {
  const lessons = await unbilledLessons(input.studentId, input.periodStart, input.periodEnd);
  if (lessons.length === 0) throw new InvoiceError("Tidak ada pertemuan yang bisa ditagih pada periode ini.");

  const draft = buildInvoiceDraft(lessons, input.discount ?? 0);
  const issueDate = todayKey();
  const invoiceNumber = await nextInvoiceNumber(issueDate);

  const [created] = await db
    .insert(invoices)
    .values({
      invoiceNumber,
      studentId: input.studentId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      issueDate,
      dueDate: addDays(issueDate, input.dueInDays ?? 14),
      status: "unpaid",
      subtotal: draft.subtotal,
      discount: draft.subtotal - draft.total,
      total: draft.total,
      publicToken: randomBytes(24).toString("base64url"),
      notes: input.notes?.trim() || null,
      createdByUserId: input.createdByUserId,
    })
    .$returningId();

  const itemValues = draft.items.flatMap((item) =>
    item.lessonIds.map((lessonId) => ({
      invoiceId: created.id,
      lessonId,
      programId: item.programId,
      description: item.description,
      quantity: 1,
      unitPrice: item.unitPrice,
      amount: item.unitPrice,
    })),
  );
  await db.insert(invoiceItems).values(itemValues);

  await db
    .update(lessonSessions)
    .set({ invoiceId: created.id })
    .where(
      inArray(
        lessonSessions.id,
        draft.items.flatMap((item) => item.lessonIds),
      ),
    );

  const invoice = await getInvoice(created.id);
  await notifyParents(input.studentId, {
    type: "invoice_unpaid",
    title: `Tagihan baru: ${invoice.invoiceNumber}`,
    body: `${formatCurrency(invoice.total)} — jatuh tempo ${invoice.dueDate ? formatDateShort(invoice.dueDate) : "belum ditentukan"}.`,
    link: "/parent/invoices",
    dedupeKey: `parent_invoice:${invoice.id}`,
  });

  return invoice;
}

export async function getInvoice(invoiceId: number): Promise<Invoice> {
  const rows = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  const invoice = rows[0];
  if (!invoice) throw new InvoiceError("Invoice tidak ditemukan.");
  return invoice;
}

export async function getInvoiceByToken(token: string) {
  const rows = await db
    .select({
      invoice: invoices,
      studentName: students.name,
      studentNickname: students.nickname,
    })
    .from(invoices)
    .innerJoin(students, eq(students.id, invoices.studentId))
    .where(eq(invoices.publicToken, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, row.invoice.id))
    .orderBy(asc(invoiceItems.description));
  return { ...row, items };
}

export async function recordPayment(invoiceId: number, amount: number): Promise<Invoice> {
  const invoice = await getInvoice(invoiceId);
  if (invoice.status === "void") throw new InvoiceError("Invoice sudah dibatalkan, tidak bisa menerima pembayaran.");
  const paidAmount = Math.max(0, Math.min(invoice.total, invoice.paidAmount + Math.round(amount)));
  const status = paymentStatusFor(invoice.total, paidAmount);
  await db
    .update(invoices)
    .set({ paidAmount, status, paidAt: status === "paid" ? new Date() : null })
    .where(eq(invoices.id, invoiceId));

  const updated = await getInvoice(invoiceId);
  if (updated.status === "paid") {
    await notifyParents(updated.studentId, {
      type: "info",
      title: `Tagihan lunas: ${updated.invoiceNumber} ✅`,
      body: `${formatCurrency(updated.total)} sudah dibayar lunas. Terima kasih!`,
      link: "/parent/invoices",
      dedupeKey: `parent_invoice_paid:${updated.id}`,
    });
  }
  return updated;
}

/**
 * Status "unpaid"/"partial"/"paid" hanya diturunkan dari paidAmount lewat
 * paymentStatusFor (lihat recordPayment) — void adalah satu-satunya transisi manual,
 * dan melepas pertemuan yang sudah tertaut agar bisa ditagih ulang.
 */
export async function voidInvoice(invoiceId: number): Promise<Invoice> {
  const invoice = await getInvoice(invoiceId);
  if (invoice.status === "void") throw new InvoiceError("Invoice sudah dibatalkan.");
  await db.update(invoices).set({ status: "void" }).where(eq(invoices.id, invoiceId));
  await db.update(lessonSessions).set({ invoiceId: null }).where(eq(lessonSessions.invoiceId, invoiceId));
  return getInvoice(invoiceId);
}

export async function deleteInvoice(invoiceId: number): Promise<void> {
  await getInvoice(invoiceId);
  await db.update(lessonSessions).set({ invoiceId: null }).where(eq(lessonSessions.invoiceId, invoiceId));
  await db.delete(invoices).where(eq(invoices.id, invoiceId));
}

export type TutorInvoiceListItem = {
  invoice: Invoice;
  studentName: string;
  studentNickname: string | null;
  studentColor: string;
};

export async function invoicesForTutor(
  tutorId: number,
  filters: { studentId?: number; status?: Invoice["status"]; onlyOutstanding?: boolean } = {},
): Promise<TutorInvoiceListItem[]> {
  const conditions: SQL[] = [eq(students.tutorId, tutorId)];
  if (filters.studentId) conditions.push(eq(invoices.studentId, filters.studentId));
  if (filters.status) conditions.push(eq(invoices.status, filters.status));
  if (filters.onlyOutstanding) conditions.push(inArray(invoices.status, ["unpaid", "partial"]));

  return db
    .select({
      invoice: invoices,
      studentName: students.name,
      studentNickname: students.nickname,
      studentColor: students.color,
    })
    .from(invoices)
    .innerJoin(students, eq(students.id, invoices.studentId))
    .where(and(...conditions))
    .orderBy(desc(invoices.issueDate), desc(invoices.id))
    .limit(200);
}

export async function getOwnedInvoice(
  tutorId: number,
  invoiceId: number,
): Promise<{ invoice: Invoice; studentName: string; studentNickname: string | null; studentColor: string }> {
  const rows = await db
    .select({
      invoice: invoices,
      studentName: students.name,
      studentNickname: students.nickname,
      studentColor: students.color,
    })
    .from(invoices)
    .innerJoin(students, eq(students.id, invoices.studentId))
    .where(and(eq(invoices.id, invoiceId), eq(students.tutorId, tutorId)))
    .limit(1);

  const row = rows[0];
  if (!row) throw new InvoiceError("Invoice tidak ditemukan.");
  return row;
}

export async function invoicesForStudent(studentId: number): Promise<Invoice[]> {
  return db.select().from(invoices).where(eq(invoices.studentId, studentId)).orderBy(desc(invoices.issueDate));
}

export async function invoiceItemsFor(invoiceId: number) {
  return db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(asc(invoiceItems.id));
}

export async function unpaidInvoicesFor(studentId: number): Promise<Invoice[]> {
  return db
    .select()
    .from(invoices)
    .where(and(eq(invoices.studentId, studentId), inArray(invoices.status, ["unpaid", "partial"])))
    .orderBy(asc(invoices.dueDate));
}
