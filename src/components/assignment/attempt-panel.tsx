"use client";

import { Check, ListChecks, Play, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { gradeAttemptAction, startAttemptAction, submitAttemptAction } from "@/app/actions/assignments";
import { QUESTION_TYPE_LABELS, labelOf } from "@/lib/domain/labels";
import { idleState } from "@/lib/form";

export type PanelQuestion = {
  id: number;
  type: "multiple_choice" | "short_answer" | "essay";
  prompt: string;
  options: string[] | null;
  points: number;
  correctAnswer: string | null;
  explanation: string | null;
};

export type PanelAnswer = {
  questionId: number;
  answer: string;
  isCorrect: boolean | null;
  pointsAwarded: number;
  feedback: string | null;
};

export type PanelAttempt = {
  id: number;
  status: "in_progress" | "submitted" | "graded";
  score: number | null;
  maxScore: number;
};

type GradeDraft = {
  verdict: "true" | "false" | "pending";
  points: number;
  feedback: string;
};

export function AttemptPanel({
  assignmentId,
  questions,
  attempt,
  answers,
}: {
  assignmentId: number;
  questions: PanelQuestion[];
  attempt: PanelAttempt | null;
  answers: PanelAnswer[];
}) {
  const router = useRouter();
  const [startState, startAction] = useActionState(startAttemptAction, idleState);
  const [submitState, submitAction] = useActionState(submitAttemptAction, idleState);
  const [gradeState, gradeAction] = useActionState(gradeAttemptAction, idleState);

  useEffect(() => {
    if (!startState.message) return;
    if (startState.ok) {
      toast.success(startState.message);
      router.refresh();
    } else {
      toast.error(startState.message);
    }
  }, [startState, router]);

  useEffect(() => {
    if (!submitState.message) return;
    if (submitState.ok) {
      toast.success(submitState.message);
      router.refresh();
    } else {
      toast.error(submitState.message);
    }
  }, [submitState, router]);

  useEffect(() => {
    if (!gradeState.message) return;
    if (gradeState.ok) {
      toast.success(gradeState.message);
      router.refresh();
    } else {
      toast.error(gradeState.message);
    }
  }, [gradeState, router]);

  const [values, setValues] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const answer of answers) initial[answer.questionId] = answer.answer;
    return initial;
  });

  const [grades, setGrades] = useState<Record<number, GradeDraft>>(() => {
    const initial: Record<number, GradeDraft> = {};
    for (const answer of answers) {
      initial[answer.questionId] = {
        verdict: answer.isCorrect === true ? "true" : answer.isCorrect === false ? "false" : "pending",
        points: answer.pointsAwarded,
        feedback: answer.feedback ?? "",
      };
    }
    return initial;
  });

  if (!attempt) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          {startState.message && !startState.ok ? <FormAlert tone="error">{startState.message}</FormAlert> : null}
          <p className="text-sm text-muted-foreground">
            Pengerjaan dilakukan bersama murid — Anda yang memasukkan jawabannya ke sistem. Soal pilihan ganda dan
            isian singkat dinilai otomatis, soal uraian Anda nilai sendiri.
          </p>
          <form action={startAction}>
            <input type="hidden" name="assignmentId" value={assignmentId} />
            <SubmitButton pendingLabel="Memulai…" className="w-full sm:w-auto">
              <Play />
              Mulai mengerjakan
            </SubmitButton>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (attempt.status === "in_progress") {
    const payload = questions.map((question) => ({
      questionId: question.id,
      answer: (values[question.id] ?? "").trim(),
    }));
    const answered = payload.filter((item) => item.answer.length > 0).length;

    return (
      <form action={submitAction} className="flex flex-col gap-4">
        <input type="hidden" name="attemptId" value={attempt.id} />
        <input type="hidden" name="answers" value={JSON.stringify(payload)} />

        {submitState.message && !submitState.ok ? <FormAlert tone="error">{submitState.message}</FormAlert> : null}

        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardContent className="flex flex-col gap-3 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {index + 1}. {question.prompt}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {labelOf(QUESTION_TYPE_LABELS, question.type)} · {question.points} poin
                  </p>
                </div>
              </div>

              {question.type === "multiple_choice" && question.options ? (
                <div className="flex flex-col gap-1.5">
                  {question.options.map((option, optionIndex) => {
                    const selected = values[question.id] === option;
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        onClick={() => setValues((prev) => ({ ...prev, [question.id]: option }))}
                        className={
                          selected
                            ? "flex items-center gap-2 rounded-lg border border-primary bg-primary/5 px-3 py-2 text-left text-xs font-medium"
                            : "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs transition-colors hover:bg-muted/50"
                        }
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px]">
                          {String.fromCharCode(65 + optionIndex)}
                        </span>
                        <span className="min-w-0 flex-1">{option}</span>
                        {selected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                      </button>
                    );
                  })}
                  {values[question.id] ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 self-start text-[11px] text-muted-foreground"
                      onClick={() =>
                        setValues((prev) => {
                          const next = { ...prev };
                          delete next[question.id];
                          return next;
                        })
                      }
                    >
                      <RotateCcw />
                      Kosongkan
                    </Button>
                  ) : null}
                </div>
              ) : (
                <Textarea
                  rows={question.type === "essay" ? 4 : 2}
                  value={values[question.id] ?? ""}
                  onChange={(event) => setValues((prev) => ({ ...prev, [question.id]: event.target.value }))}
                  placeholder={question.type === "essay" ? "Tulis jawaban murid…" : "Jawaban singkat"}
                />
              )}
            </CardContent>
          </Card>
        ))}

        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-muted-foreground">
            {answered} dari {questions.length} soal terisi.
          </p>
          <SubmitButton pendingLabel="Menilai…" className="w-full sm:w-auto">
            Simpan & nilai
          </SubmitButton>
        </div>
      </form>
    );
  }

  const answerByQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  const manualQuestions = questions.filter((question) => answerByQuestion.get(question.id)?.isCorrect === null);
  const graded = attempt.status === "graded";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold">Hasil</p>
            <Badge variant={graded ? "success" : "warning"} className="text-[10px]">
              {graded ? "Sudah dinilai" : "Perlu penilaian"}
            </Badge>
          </div>
          <p className="text-2xl font-black">
            {attempt.score ?? 0}
            <span className="text-sm font-medium text-muted-foreground"> / {attempt.maxScore}</span>
          </p>
          {attempt.maxScore > 0 ? (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.round(((attempt.score ?? 0) / attempt.maxScore) * 100)}%` }}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {manualQuestions.length > 0 && !graded ? (
        <form action={gradeAction} className="flex flex-col gap-4">
          <input type="hidden" name="attemptId" value={attempt.id} />
          <input
            type="hidden"
            name="answers"
            value={JSON.stringify(
              manualQuestions.map((question) => {
                const draft = grades[question.id];
                return {
                  questionId: question.id,
                  isCorrect: draft?.verdict === "pending" ? "" : (draft?.verdict ?? ""),
                  pointsAwarded: draft?.points ?? 0,
                  feedback: draft?.feedback ?? "",
                };
              }),
            )}
          />

          {gradeState.message && !gradeState.ok ? <FormAlert tone="error">{gradeState.message}</FormAlert> : null}

          <p className="text-xs text-muted-foreground">
            {manualQuestions.length} soal perlu penilaian manual. Perubahan tersimpan setelah Anda menekan Simpan.
          </p>

          {manualQuestions.map((question) => {
            const answer = answerByQuestion.get(question.id);
            const draft = grades[question.id] ?? { verdict: "pending" as const, points: 0, feedback: "" };
            const patchGrade = (changes: Partial<GradeDraft>) =>
              setGrades((prev) => ({ ...prev, [question.id]: { ...draft, ...changes } }));
            return (
              <Card key={question.id}>
                <CardContent className="flex flex-col gap-3 pt-4">
                  <p className="text-sm font-medium">{question.prompt}</p>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground">Jawaban murid</p>
                    <p className="mt-0.5 whitespace-pre-line text-xs">{answer?.answer || "Tidak dijawab"}</p>
                  </div>
                  {question.correctAnswer ? (
                    <p className="text-xs text-muted-foreground">
                      Kunci: <span className="font-medium text-foreground">{question.correctAnswer}</span>
                    </p>
                  ) : null}

                  <FieldGroup>
                    <div className="grid grid-cols-[1fr_6rem] gap-3">
                      <Field label="Penilaian" htmlFor={`verdict-${question.id}`}>
                        <Select
                          value={draft.verdict}
                          onValueChange={(value) =>
                            patchGrade({
                              verdict: value as GradeDraft["verdict"],
                              points: value === "true" ? question.points : value === "false" ? 0 : draft.points,
                            })
                          }
                        >
                          <SelectTrigger id={`verdict-${question.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Belum dinilai</SelectItem>
                            <SelectItem value="true">Benar</SelectItem>
                            <SelectItem value="false">Salah</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Poin" htmlFor={`points-${question.id}`}>
                        <Input
                          id={`points-${question.id}`}
                          type="number"
                          min={0}
                          max={question.points}
                          value={draft.points}
                          onChange={(event) => patchGrade({ points: Number(event.target.value) })}
                        />
                      </Field>
                    </div>
                    <Field label="Catatan" htmlFor={`feedback-${question.id}`} hint={`Maksimal ${question.points} poin.`}>
                      <Textarea
                        id={`feedback-${question.id}`}
                        rows={2}
                        value={draft.feedback}
                        onChange={(event) => patchGrade({ feedback: event.target.value })}
                        placeholder="Contoh: Langkahnya benar, hanya kurang menyederhanakan pecahan."
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            );
          })}

          <SubmitButton pendingLabel="Menyimpan…" className="w-full sm:w-auto">
            Simpan penilaian
          </SubmitButton>
        </form>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-bold">Rincian jawaban</h2>
        {questions.map((question, index) => {
          const answer = answerByQuestion.get(question.id);
          const correct = answer?.isCorrect;
          return (
            <Card key={question.id}>
              <CardContent className="flex flex-col gap-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    {index + 1}. {question.prompt}
                  </p>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {correct === true ? (
                      <Badge variant="success" className="text-[10px]">
                        <Check />
                        Benar
                      </Badge>
                    ) : correct === false ? (
                      <Badge variant="destructive" className="text-[10px]">
                        <X />
                        Salah
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        <ListChecks />
                        Manual
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {answer?.pointsAwarded ?? 0}/{question.points}
                    </span>
                  </div>
                </div>
                <p className="whitespace-pre-line text-xs text-muted-foreground">
                  Jawaban: {answer?.answer || "Tidak dijawab"}
                </p>
                {question.correctAnswer ? (
                  <p className="text-xs text-muted-foreground">
                    Kunci: <span className="font-medium text-foreground">{question.correctAnswer}</span>
                  </p>
                ) : null}
                {answer?.feedback ? <p className="text-xs text-muted-foreground">Catatan: {answer.feedback}</p> : null}
                {question.explanation ? (
                  <p className="text-xs text-muted-foreground">Pembahasan: {question.explanation}</p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
