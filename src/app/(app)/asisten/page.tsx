import { FcSms } from "react-icons/fc";
import type { Metadata } from "next";
import { ChatNewButton } from "@/components/chat/chat-new-button";
import { ChatSessionRow } from "@/components/chat/chat-session-row";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { listChatSessions } from "@/lib/services/ai-chat";
import { listStudents } from "@/lib/services/students";

export const metadata: Metadata = { title: "Asisten AI" };

export default async function AsistenPage() {
  const tutor = await requireTutor();
  const [sessions, students] = await Promise.all([listChatSessions(tutor.id), listStudents(tutor.id, {})]);

  const studentLabel = new Map(students.map((s) => [s.id, s.nickname || s.name]));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Asisten AI"
        description="Ngobrol langsung untuk buat, revisi, dan cek soal — tanpa isi form."
        action={
          students.length > 0 ? (
            <ChatNewButton students={students.map((s) => ({ id: s.id, name: s.name, nickname: s.nickname }))} />
          ) : undefined
        }
      />

      {sessions.length === 0 ? (
        <EmptyState
          icon={FcSms}
          title="Belum ada percakapan"
          description='Mulai dengan bilang, misalnya: "Buatkan STS kelas 3 dari rangkuman ini, 30 PG + 15 isian."'
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {sessions.map((session) => (
            <ChatSessionRow
              key={session.id}
              session={{
                id: session.id,
                title: session.title,
                studentLabel: session.studentId ? (studentLabel.get(session.studentId) ?? null) : null,
                questionCount: session.state.questions.length,
                updatedAt: session.updatedAt.toISOString(),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
