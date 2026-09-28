import { NextResponse } from "next/server";
import { buildAssignmentDocx } from "@/lib/ai/export-word";
import { getSessionUserOrThrow } from "@/lib/auth";
import { ChatError, getOwnedChatSession } from "@/lib/services/ai-chat";

export async function GET(_request: Request, props: RouteContext<"/api/ai/chat/[sessionId]/export-word">) {
  try {
    const user = await getSessionUserOrThrow();
    if (user.role !== "tutor") {
      return NextResponse.json({ error: "Hanya pengajar yang bisa memakai fitur ini." }, { status: 403 });
    }

    const { sessionId } = await props.params;
    const session = await getOwnedChatSession(user.id, Number(sessionId));
    if (session.state.questions.length === 0) {
      return NextResponse.json({ error: "Belum ada soal di percakapan ini." }, { status: 400 });
    }

    const body = await buildAssignmentDocx({
      title: session.state.subject || session.title,
      subject: session.state.subject,
      grade: session.state.grade,
      material: session.state.material,
      questions: session.state.questions,
    });

    const filename = `${(session.state.subject || session.title || "soal").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.docx`;

    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Length": String(body.length),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ChatError) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json({ error: "Gagal membuat file Word." }, { status: 500 });
  }
}
