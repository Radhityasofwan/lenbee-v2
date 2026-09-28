import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PublicAttemptPanel } from "@/components/assignment/public-attempt-panel";
import { getAssignmentByToken } from "@/lib/services/assignments";

export const metadata: Metadata = { title: "Tugas" };

export default async function SharedAssignmentPage(props: PageProps<"/share/assignment/[token]">) {
  const params = await props.params;
  const token = params.token;
  if (!token) notFound();

  const data = await getAssignmentByToken(token);
  if (!data) notFound();

  const { assignment, studentName, studentNickname, questions, attempt } = data;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 safe-bottom">
      <header>
        <p className="text-lg font-bold tracking-tight text-foreground">{assignment.title}</p>
        <p className="text-xs text-muted-foreground">
          Untuk {studentNickname || studentName}
          {assignment.material ? ` · ${assignment.material}` : ""}
        </p>
      </header>

      {assignment.instructions ? (
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <p className="whitespace-pre-line text-xs text-muted-foreground">{assignment.instructions}</p>
        </div>
      ) : null}

      {questions.length === 0 ? (
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Tugas ini belum punya soal. Coba lagi nanti.</p>
        </div>
      ) : (
        <PublicAttemptPanel
          token={token}
          questions={questions}
          initialAttempt={
            attempt
              ? { id: attempt.id, status: attempt.status, score: attempt.score, maxScore: attempt.maxScore }
              : null
          }
        />
      )}
    </main>
  );
}
