import { Play, Sparkles } from "lucide-react";
import { FcTodoList } from "react-icons/fc";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AssignmentActions } from "@/components/assignment/assignment-actions";
import { AssignmentShare } from "@/components/assignment/assignment-share";
import { QuestionBuilder } from "@/components/assignment/question-builder";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { formatDateShort, pluralize, toDateKey } from "@/lib/datetime";
import {
  ASSIGNMENT_STATUS_LABELS,
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  labelOf,
} from "@/lib/domain/labels";
import {
  AssignmentError,
  attemptsForAssignment,
  getOwnedAssignment,
  questionsForAssignment,
} from "@/lib/services/assignments";
import { AI_ATTACHABLE_MIME_TYPES, documentsForTutor } from "@/lib/services/documents";
import { getOwnedStudent, programsForStudent } from "@/lib/services/students";

const ATTEMPT_STATUS_LABELS: Record<string, string> = {
  in_progress: "Sedang dikerjakan",
  submitted: "Perlu penilaian",
  graded: "Sudah dinilai",
};

function attemptStamp(date: Date) {
  const time = date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return `${formatDateShort(toDateKey(date))} · ${time} ${"WIB"}`;
}

export default async function AssignmentDetailPage(props: PageProps<"/assignments/[id]">) {
  const user = await requireTutor();
  const { id } = await props.params;
  const assignmentId = Number(id);

  let assignment;
  try {
    assignment = await getOwnedAssignment(user.id, assignmentId);
  } catch (error) {
    if (error instanceof AssignmentError) notFound();
    throw error;
  }

  const [student, programs, questionRows, attempts, studentDocuments] = await Promise.all([
    getOwnedStudent(user.id, assignment.studentId),
    programsForStudent(assignment.studentId),
    questionsForAssignment(assignment.id),
    attemptsForAssignment(user.id, assignment.id),
    documentsForTutor(user.id, { studentId: assignment.studentId }),
  ]);

  const attachableDocuments = studentDocuments
    .filter((row) => AI_ATTACHABLE_MIME_TYPES.has(row.document.mimeType))
    .map((row) => ({ id: row.document.id, title: row.document.title }));

  const programName = assignment.programId
    ? (programs.find((program) => program.id === assignment.programId)?.name ?? null)
    : null;
  const totalPoints = questionRows.reduce((sum, question) => sum + question.points, 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={assignment.title}
        description={`${student.nickname || student.name}${programName ? ` · ${programName}` : ""}`}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/assignments">Kembali</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-center gap-3">
            <StudentAvatar name={student.name} color={student.color} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{student.nickname || student.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {assignment.material ? `${assignment.material} · ` : ""}
                {pluralize(questionRows.length, "soal")} · {totalPoints} poin
              </p>
            </div>
            {assignment.aiGenerated ? <Sparkles className="size-4 shrink-0 text-primary" /> : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={
                assignment.status === "published" ? "success" : assignment.status === "archived" ? "secondary" : "outline"
              }
              className="text-[10px]"
            >
              {labelOf(ASSIGNMENT_STATUS_LABELS, assignment.status)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {labelOf(DIFFICULTY_LABELS, assignment.difficulty)}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              Dibuat {formatDateShort(toDateKey(assignment.createdAt))}
            </span>
          </div>

          {assignment.instructions ? (
            <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              {assignment.instructions}
            </p>
          ) : null}

          <AssignmentActions
            assignmentId={assignment.id}
            status={assignment.status}
            questionCount={questionRows.length}
          />

          {assignment.status === "published" && questionRows.length > 0 ? (
            <AssignmentShare
              token={assignment.publicToken}
              title={assignment.title}
              studentLabel={student.nickname || student.name}
              parentPhone={student.parentPhone}
            />
          ) : null}
        </CardContent>
      </Card>

      {questionRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daftar soal</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {questionRows.map((question, index) => (
              <div key={question.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    {index + 1}. {question.prompt}
                  </p>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {question.points} poin
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {labelOf(QUESTION_TYPE_LABELS, question.type)}
                </p>
                {question.type === "multiple_choice" && question.options ? (
                  <ul className="mt-2 flex flex-col gap-1">
                    {question.options.map((option, optionIndex) => (
                      <li
                        key={optionIndex}
                        className={
                          option === question.correctAnswer
                            ? "text-xs font-medium text-primary"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {question.correctAnswer && question.type !== "multiple_choice" ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Kunci: <span className="font-medium text-foreground">{question.correctAnswer}</span>
                  </p>
                ) : null}
                {question.explanation ? (
                  <p className="mt-1 text-xs text-muted-foreground">Pembahasan: {question.explanation}</p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <QuestionBuilder
        assignmentId={assignment.id}
        studentId={assignment.studentId}
        studentLabel={student.nickname || student.name}
        initialQuestions={questionRows}
        initialAiGenerated={assignment.aiGenerated}
        attachableDocuments={attachableDocuments}
        subjectHint={programName ?? ""}
        materialHint={assignment.material ?? ""}
        gradeHint={student.grade ?? ""}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Riwayat pengerjaan</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <EmptyState
              icon={FcTodoList}
              title="Belum ada pengerjaan"
              description="Mulai pengerjaan setelah soal siap, lalu masukkan jawaban murid."
              action={
                questionRows.length > 0 ? (
                  <Button asChild size="sm">
                    <Link href={`/assignments/${assignment.id}/attempt`}>
                      <Play />
                      Kerjakan
                    </Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {attempts.map((row) => (
                <Link
                  key={row.attempt.id}
                  href={`/assignments/${assignment.id}/attempt?attempt=${row.attempt.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium">
                      {row.attempt.score !== null ? `${row.attempt.score}/${row.attempt.maxScore}` : "Belum dinilai"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {attemptStamp(row.attempt.submittedAt ?? row.attempt.startedAt)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      row.attempt.status === "graded"
                        ? "success"
                        : row.attempt.status === "submitted"
                          ? "warning"
                          : "outline"
                    }
                    className="shrink-0 text-[10px]"
                  >
                    {ATTEMPT_STATUS_LABELS[row.attempt.status] ?? row.attempt.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
