import { NextResponse } from "next/server";
import { parseJson, errorMessage } from "@/lib/form";
import { aiParentUpdateSchema, parentUpdateSchema } from "@/lib/validation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { parentUpdateSource } from "@/lib/services/reports";
import { generateParentUpdate } from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const user = await getSessionUserOrThrow();
    if (user.role !== "tutor") {
      return NextResponse.json({ error: "Hanya pengajar yang bisa memakai fitur ini." }, { status: 403 });
    }

    const body = await request.json();
    const ids = parseJson(aiParentUpdateSchema, body);
    if (!ids.success) return NextResponse.json({ error: ids.state.message }, { status: 400 });

    const draft = parseJson(parentUpdateSchema.partial(), body);

    const source = await parentUpdateSource(
      user.id,
      Number(ids.data.studentId),
      ids.data.periodStart,
      ids.data.periodEnd,
    );

    const result = await generateParentUpdate(user.id, {
      ...source,
      styleOverride: draft.success ? draft.data.body : undefined,
    });

    return NextResponse.json({ text: result.text, usedAi: result.usedAi });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Gagal membuat rangkuman.") }, { status: 500 });
  }
}
