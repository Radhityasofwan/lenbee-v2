import { describe, expect, it } from "vitest";
import { buildInvoiceDraft, invoiceNumberFor, paymentStatusFor, unitPriceFor, type BillableLesson } from "./invoice";

function lesson(overrides: Partial<BillableLesson> = {}): BillableLesson {
  return {
    lessonId: 1,
    programId: 10,
    programName: "Matematika SD",
    date: "2026-03-02",
    durationMinutes: 60,
    rate: 75_000,
    rateUnit: "per_session",
    ...overrides,
  };
}

describe("unitPriceFor", () => {
  it("memakai tarif apa adanya untuk satuan per pertemuan", () => {
    expect(unitPriceFor(lesson({ rate: 75_000, rateUnit: "per_session", durationMinutes: 90 }))).toBe(75_000);
  });

  it("menghitung proporsional durasi untuk satuan per jam", () => {
    expect(unitPriceFor(lesson({ rate: 120_000, rateUnit: "per_hour", durationMinutes: 90 }))).toBe(180_000);
    expect(unitPriceFor(lesson({ rate: 100_000, rateUnit: "per_hour", durationMinutes: 45 }))).toBe(75_000);
  });
});

describe("buildInvoiceDraft", () => {
  it("mengelompokkan pertemuan per program dan tarif", () => {
    const draft = buildInvoiceDraft([
      lesson({ lessonId: 1 }),
      lesson({ lessonId: 2 }),
      lesson({ lessonId: 3, programId: 11, programName: "Bahasa Inggris" }),
    ]);

    expect(draft.items).toHaveLength(2);
    expect(draft.items[0].description).toBe("Bahasa Inggris");
    expect(draft.items[0].quantity).toBe(1);
    expect(draft.items[1]).toMatchObject({ description: "Matematika SD", quantity: 2, unitPrice: 75_000, amount: 150_000 });
    expect(draft.items[1].lessonIds).toEqual([1, 2]);
    expect(draft.subtotal).toBe(225_000);
    expect(draft.total).toBe(225_000);
    expect(draft.lessonCount).toBe(3);
  });

  it("memisahkan item saat tarif program berubah (mis. kenaikan harga)", () => {
    const draft = buildInvoiceDraft([lesson({ lessonId: 1, rate: 75_000 }), lesson({ lessonId: 2, rate: 85_000 })]);

    expect(draft.items).toHaveLength(2);
    expect(draft.subtotal).toBe(160_000);
  });

  it("mengurangi diskon dan membatasinya pada subtotal", () => {
    const discounted = buildInvoiceDraft([lesson(), lesson({ lessonId: 2 })], 50_000);
    expect(discounted.total).toBe(100_000);

    const over = buildInvoiceDraft([lesson()], 999_999);
    expect(over.total).toBe(0);
  });

  it("mengabaikan diskon negatif", () => {
    expect(buildInvoiceDraft([lesson()], -10_000).total).toBe(75_000);
  });

  it("menghasilkan draft kosong untuk daftar pertemuan kosong", () => {
    const draft = buildInvoiceDraft([]);
    expect(draft).toEqual({ items: [], subtotal: 0, total: 0, lessonCount: 0 });
  });

  it("tidak memodifikasi input", () => {
    const lessons = [lesson({ lessonId: 1 })];
    const snapshot = structuredClone(lessons);
    buildInvoiceDraft(lessons);
    expect(lessons).toEqual(snapshot);
  });
});

describe("invoiceNumberFor", () => {
  it("memformat nomor invoice dengan periode bulan", () => {
    expect(invoiceNumberFor(7, new Date(2026, 2, 15))).toBe("INV/202603/0007");
  });

  it("mempertahankan urutan ribuan", () => {
    expect(invoiceNumberFor(1234, new Date(2026, 11, 1))).toBe("INV/202612/1234");
  });
});

describe("paymentStatusFor", () => {
  it("menentukan status dari jumlah yang dibayar", () => {
    expect(paymentStatusFor(150_000, 0)).toBe("unpaid");
    expect(paymentStatusFor(150_000, 75_000)).toBe("partial");
    expect(paymentStatusFor(150_000, 150_000)).toBe("paid");
    expect(paymentStatusFor(150_000, 200_000)).toBe("paid");
  });
});
