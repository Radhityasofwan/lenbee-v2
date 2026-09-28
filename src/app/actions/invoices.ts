"use server";

import { revalidatePath } from "next/cache";
import { getTutorOrThrow } from "@/lib/auth";
import { diffDays, todayKey } from "@/lib/datetime";
import { errorMessage, fail, okay, parseForm, type ActionState } from "@/lib/form";
import {
  InvoiceError,
  deleteInvoice,
  generateInvoice,
  getOwnedInvoice,
  recordPayment,
  voidInvoice,
} from "@/lib/services/invoices";
import { getOwnedStudent } from "@/lib/services/students";
import { invoiceGenerateSchema, invoicePaymentSchema, invoiceVoidSchema } from "@/lib/validation";

function revalidateInvoices(invoiceId?: number) {
  revalidatePath("/invoices");
  revalidatePath("/home");
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/parent/invoices");
}

export async function generateInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(invoiceGenerateSchema, formData);
  if (!parsed.success) return parsed.state;

  const { studentId, periodStart, periodEnd, dueDate, discount, notes } = parsed.data;

  try {
    const tutor = await getTutorOrThrow();
    await getOwnedStudent(tutor.id, Number(studentId));
    const issueDate = todayKey();
    const invoice = await generateInvoice({
      studentId: Number(studentId),
      periodStart,
      periodEnd,
      discount,
      dueInDays: dueDate ? Math.max(0, diffDays(dueDate, issueDate)) : undefined,
      notes: notes ?? null,
      createdByUserId: tutor.id,
    });
    revalidateInvoices(invoice.id);
    return okay(`Invoice ${invoice.invoiceNumber} dibuat.`, { invoiceId: invoice.id });
  } catch (error) {
    if (error instanceof InvoiceError) return fail(error.message);
    return fail(errorMessage(error, "Gagal membuat invoice."));
  }
}

export async function recordPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(invoicePaymentSchema, formData);
  if (!parsed.success) return parsed.state;

  const invoiceId = Number(parsed.data.invoiceId);

  try {
    const tutor = await getTutorOrThrow();
    await getOwnedInvoice(tutor.id, invoiceId);
    const updated = await recordPayment(invoiceId, parsed.data.amount);
    revalidateInvoices(invoiceId);
    return okay(
      updated.status === "paid" ? "Pembayaran dicatat. Invoice lunas." : "Pembayaran dicatat.",
    );
  } catch (error) {
    if (error instanceof InvoiceError) return fail(error.message);
    return fail(errorMessage(error, "Gagal mencatat pembayaran."));
  }
}

export async function voidInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(invoiceVoidSchema, formData);
  if (!parsed.success) return parsed.state;

  const invoiceId = Number(parsed.data.invoiceId);

  try {
    const tutor = await getTutorOrThrow();
    await getOwnedInvoice(tutor.id, invoiceId);
    await voidInvoice(invoiceId);
    revalidateInvoices(invoiceId);
  } catch (error) {
    if (error instanceof InvoiceError) return fail(error.message);
    return fail(errorMessage(error, "Gagal membatalkan invoice."));
  }

  return okay("Invoice dibatalkan. Pertemuan bisa ditagih ulang.");
}

export async function deleteInvoiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const invoiceId = Number(formData.get("invoiceId"));
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) return fail("Invoice tidak ditemukan.");

  try {
    const tutor = await getTutorOrThrow();
    await getOwnedInvoice(tutor.id, invoiceId);
    await deleteInvoice(invoiceId);
    revalidateInvoices(invoiceId);
  } catch (error) {
    if (error instanceof InvoiceError) return fail(error.message);
    return fail(errorMessage(error, "Gagal menghapus invoice."));
  }

  return okay("Invoice dihapus. Pertemuan bisa ditagih ulang.");
}
