import Link from "next/link";
import { notFound } from "next/navigation";
import { AttemptPanel, type PanelAnswer, type PanelQuestion } from "@/components/assignment/attempt-panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import {
  AssignmentError,
  answersForAttempt,
  attemptsForAssignment,
  getOwnedAssignment,
  questionsForAssignment,
} from "@/lib/services/assignments";
import { getOwnedStudent } from "@/lib/services/students";

export default async function AssignmentAttemptPage(props: PageProps<"/assignments/[id]/attempt">) {
  const user = await requireTutor();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const assignmentId = Number(id);

  let assignment;
  try {
    assignment = await getOwnedAssignment(user.id, assignmentId);
  } catch (error) {
    if (error instanceof AssignmentError) notFound();
    throw error;
  }

  const [student, questionRows, attemptRows] = await Promise.all([
    getOwnedStudent(user.id, assignment.studentId),
    questionsForAssignment(assignment.id),
    attemptsForAssignment(user.id, assignment.id),
  ]);

  const requestedId = searchParams?.attempt ? Number(searchParams.attempt) : null;
  const selected =
    (requestedId ? attemptRows.find((row) => row.attempt.id === requestedId) : undefined) ??
    attemptRows.find((row) => row.attempt.status === "in_progress") ??
    attemptRows[0];

  const answerRows = selected ? await answersForAttempt(selected.attempt.id) : [];

  const questions: PanelQuestion[] = questionRows.map((question) => ({
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    options: question.options ?? null,
    points: question.points,
    correctAnswer: question.correctAnswer ?? null,
    explanation: question.explanation ?? null,
  }));

  const answers: PanelAnswer[] = answerRows.map((answer) => ({
    questionId: answer.questionId,
    answer: answer.answer ?? "",
    isCorrect: answer.isCorrect ?? null,
    pointsAwarded: answer.pointsAwarded,
    feedback: answer.feedback ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={assignment.title}
        description={`${student.nickname || student.name}${assignment.material ? ` · ${assignment.material}` : ""}`}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={`/assignments/${assignment.id}`}>Kembali</Link>
          </Button>
        }
      />

      {questions.length === 0 ? (
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">
            Tugas ini belum punya soal. Tambahkan soal terlebih dahulu sebelum mulai mengerjakan.
          </p>
        </div>
      ) : (
        <AttemptPanel
          assignmentId={assignment.id}
          questions={questions}
          attempt={
            selected
              ? {
                  id: selected.attempt.id,
                  status: selected.attempt.status,
                  score: selected.attempt.score ?? null,
                  maxScore: selected.attempt.maxScore,
                }
              : null
          }
          answers={answers}
        />
      )}
    </div>
  );
}
