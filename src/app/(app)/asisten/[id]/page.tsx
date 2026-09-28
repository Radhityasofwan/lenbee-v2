import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChatDraftPanel } from "@/components/chat/chat-draft-panel";
import { ChatThread } from "@/components/chat/chat-thread";
import { Button } from "@/components/ui/button";
import { requireTutor } from "@/lib/auth";
import { ChatError, getOwnedChatSession, messagesForSession } from "@/lib/services/ai-chat";
import { AI_ATTACHABLE_MIME_TYPES, documentsForTutor } from "@/lib/services/documents";
import { getOwnedStudent } from "@/lib/services/students";

export const metadata: Metadata = { title: "Asisten AI" };

export default async function ChatSessionPage(props: PageProps<"/asisten/[id]">) {
  const tutor = await requireTutor();
  const { id } = await props.params;
  const sessionId = Number(id);

  let session;
  try {
    session = await getOwnedChatSession(tutor.id, sessionId);
  } catch (error) {
    if (error instanceof ChatError) notFound();
    throw error;
  }

  const [messages, student, studentDocuments] = await Promise.all([
    messagesForSession(tutor.id, sessionId),
    session.studentId ? getOwnedStudent(tutor.id, session.studentId) : Promise.resolve(null),
    session.studentId ? documentsForTutor(tutor.id, { studentId: session.studentId }) : Promise.resolve([]),
  ]);

  const attachableDocuments = studentDocuments
    .filter((row) => AI_ATTACHABLE_MIME_TYPES.has(row.document.mimeType))
    .map((row) => ({ id: row.document.id, title: row.document.title }));

  const { subject, material, questions, reportDraft } = session.state;

  return (
    <div className="-mb-24 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm" className="-ml-2 shrink-0 text-muted-foreground">
          <Link href="/asisten" aria-label="Kembali ke Asisten AI">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{session.title}</p>
          {student ? <p className="truncate text-xs text-muted-foreground">{student.nickname || student.name}</p> : null}
        </div>
      </div>

      <ChatDraftPanel
        subject={subject}
        material={material}
        questions={questions}
        reportDraft={reportDraft}
        studentId={session.studentId}
        sessionId={session.id}
      />

      <ChatThread
        sessionId={session.id}
        initialMessages={messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        }))}
        attachableDocuments={attachableDocuments}
        hasQuestions={questions.length > 0}
      />
    </div>
  );
}
