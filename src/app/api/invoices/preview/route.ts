import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { errorMessage, parseJson } from "@/lib/form";
import { previewInvoice } from "@/lib/services/invoices";
import { getOwnedStudent } from "@/lib/services/students";

const previewSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  periodStart: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD."),
  periodEnd: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD."),
  discount: z.coerce.number().int().min(0).default(0),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
    if (user.role !== "tutor") return NextResponse.json({ error: "Hanya pengajar yang bisa memakai fitur ini." }, { status: 403 });

    const body = await request.json();
    const parsed = parseJson(previewSchema, body);
    if (!parsed.success) return NextResponse.json({ error: parsed.state.message }, { status: 400 });

    const { studentId, periodStart, periodEnd, discount } = parsed.data;
    await getOwnedStudent(user.id, studentId);
    const preview = await previewInvoice(studentId, periodStart, periodEnd, discount);

    return NextResponse.json({
      lessonCount: preview.draft.lessonCount,
      subtotal: preview.draft.subtotal,
      total: preview.draft.total,
      items: preview.draft.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Gagal menghitung tagihan.") }, { status: 500 });
  }
}
