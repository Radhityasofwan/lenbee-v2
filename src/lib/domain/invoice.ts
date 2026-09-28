export type BillableLesson = {
  lessonId: number;
  programId: number;
  programName: string;
  date: string;
  durationMinutes: number;
  rate: number;
  rateUnit: "per_session" | "per_hour";
};

export type InvoiceDraftItem = {
  programId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  lessonIds: number[];
};

export type InvoiceDraft = {
  items: InvoiceDraftItem[];
  subtotal: number;
  total: number;
  lessonCount: number;
};

export function unitPriceFor(lesson: Pick<BillableLesson, "rate" | "rateUnit" | "durationMinutes">): number {
  if (lesson.rateUnit === "per_hour") {
    return Math.round((lesson.rate * lesson.durationMinutes) / 60);
  }
  return lesson.rate;
}

/**
 * Mengelompokkan pertemuan selesai menjadi item invoice per program & tarif.
 * Contoh: "Pelajaran Sekolah — 12 pertemuan × Rp75.000".
 */
export function buildInvoiceDraft(lessons: BillableLesson[], discount = 0): InvoiceDraft {
  const groups = new Map<string, InvoiceDraftItem>();

  for (const lesson of lessons) {
    const unitPrice = unitPriceFor(lesson);
    const key = `${lesson.programId}:${unitPrice}`;
    const existing = groups.get(key);
    if (existing) {
      existing.quantity += 1;
      existing.amount += unitPrice;
      existing.lessonIds.push(lesson.lessonId);
    } else {
      groups.set(key, {
        programId: lesson.programId,
        description: lesson.programName,
        quantity: 1,
        unitPrice,
        amount: unitPrice,
        lessonIds: [lesson.lessonId],
      });
    }
  }

  const items = [...groups.values()].sort((a, b) => a.description.localeCompare(b.description, "id"));
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const safeDiscount = Math.max(0, Math.min(Math.round(discount), subtotal));

  return {
    items,
    subtotal,
    total: subtotal - safeDiscount,
    lessonCount: lessons.length,
  };
}

export function invoiceNumberFor(sequence: number, date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `INV/${year}${month}/${String(sequence).padStart(4, "0")}`;
}

export function paymentStatusFor(total: number, paidAmount: number): "unpaid" | "partial" | "paid" {
  if (paidAmount <= 0) return "unpaid";
  if (paidAmount >= total) return "paid";
  return "partial";
}
