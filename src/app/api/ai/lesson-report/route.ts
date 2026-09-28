import { NextResponse } from "next/server";
import { parseJson, errorMessage } from "@/lib/form";
import { aiReportSchema, lessonReportSchema } from "@/lib/validation";
import { getSessionUserOrThrow } from "@/lib/auth";
import { getOwnedLesson } from "@/lib/services/sessions";
import { generateLessonReport } from "@/lib/ai";
import { FOCUS_LABELS, labelOf } from "@/lib/domain/labels";
import { db } from "@/db";
import { programs, students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatDateLong, timeRangeLabel } from "@/lib/datetime";

export async function POST(request: Request) {
  try {
    const user = await getSessionUserOrThrow();
    if (user.role !== "tutor") return NextResponse.json({ error: "Hanya pengajar yang bisa memakai fitur ini." }, { status: 403 });

    const body = await request.json();
    const ids = parseJson(aiReportSchema, body);
    if (!ids.success) return NextResponse.json({ error: ids.state.message }, { status: 400 });

    const draft = parseJson(lessonReportSchema.partial(), body);
    if (!draft.success) return NextResponse.json({ error: draft.state.message }, { status: 400 });

    const lesson = await getOwnedLesson(user.id, Number(ids.data.lessonId));

    const [student] = await db.select().from(students).where(eq(students.id, lesson.studentId)).limit(1);
    const [program] = await db.select().from(programs).where(eq(programs.id, lesson.programId)).limit(1);

    const result = await generateLessonReport(user.id, {
      studentName: student?.nickname || student?.name || "Anak",
      programName: program?.name ?? "Les",
      dateLabel: formatDateLong(lesson.date),
      timeLabel: timeRangeLabel(lesson.startTime, lesson.endTime),
      focusLabel: labelOf(FOCUS_LABELS, draft.data.focus ?? lesson.focus, ""),
      topicLabel: draft.data.topicLabel ?? lesson.topicLabel,
      material: draft.data.material ?? lesson.material,
      activities: draft.data.activities ?? lesson.activities,
      notes: draft.data.notes ?? lesson.notes,
    });

    return NextResponse.json({ text: result.text, usedAi: result.usedAi });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Gagal membuat report.") }, { status: 500 });
  }
}
