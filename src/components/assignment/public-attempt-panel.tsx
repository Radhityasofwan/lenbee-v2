"use client";

import { Check, Play, RotateCcw } from "lucide-react";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { startAttemptByTokenAction, submitAttemptByTokenAction } from "@/app/actions/public-assignment";
import { QUESTION_TYPE_LABELS, labelOf } from "@/lib/domain/labels";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import type { PublicAssignmentQuestion } from "@/lib/services/assignments";

export type PublicAttempt = {
  id: number;
  status: "in_progress" | "submitted" | "graded";
  score: number | null;
  maxScore: number;
};

export function PublicAttemptPanel({
  token,
  questions,
  initialAttempt,
}: {
  token: string;
  questions: PublicAssignmentQuestion[];
  initialAttempt: PublicAttempt | null;
}) {
  const [attempt, setAttempt] = useState(initialAttempt);
  const [values, setValues] = useState<Record<number, string>>({});

  const [startState, startAction] = useActionState(startAttemptByTokenAction, idleState);
  const [submitState, submitAction] = useActionState(submitAttemptByTokenAction, idleState);

  useActionToast(startState, () => {
    if (startState.data?.attemptId) {
      setAttempt({ id: Number(startState.data.attemptId), status: "in_progress", score: null, maxScore: 0 });
    }
  });

  useActionToast(submitState, () => {
    if (!attempt) return;
    setAttempt({
      ...attempt,
      status: submitState.data?.needsManualReview ? "submitted" : "graded",
      score: typeof submitState.data?.score === "number" ? submitState.data.score : attempt.score,
      maxScore: typeof submitState.data?.maxScore === "number" ? submitState.data.maxScore : attempt.maxScore,
    });
  });

  if (!attempt) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 pt-4">
          {startState.message && !startState.ok ? <FormAlert tone="error">{startState.message}</FormAlert> : null}
          <p className="text-sm text-muted-foreground">
            {questions.length} soal menunggu. Kerjakan langsung dari HP, jawaban tersimpan otomatis saat dikirim.
          </p>
          <form action={startAction}>
            <input type="hidden" name="token" value={token} />
            <SubmitButton pendingLabel="Memulai…" className="w-full">
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
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="attemptId" value={attempt.id} />
        <input type="hidden" name="answers" value={JSON.stringify(payload)} />

        {submitState.message && !submitState.ok ? <FormAlert tone="error">{submitState.message}</FormAlert> : null}

        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardContent className="flex flex-col gap-3 pt-4">
              <div>
                <p className="text-sm font-medium">
                  {index + 1}. {question.prompt}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {labelOf(QUESTION_TYPE_LABELS, question.type)} · {question.points} poin
                </p>
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
                    <button
                      type="button"
                      className="inline-flex w-fit items-center gap-1 self-start text-[11px] text-muted-foreground"
                      onClick={() =>
                        setValues((prev) => {
                          const next = { ...prev };
                          delete next[question.id];
                          return next;
                        })
                      }
                    >
                      <RotateCcw className="size-3" />
                      Kosongkan
                    </button>
                  ) : null}
                </div>
              ) : (
                <Textarea
                  rows={question.type === "essay" ? 4 : 2}
                  value={values[question.id] ?? ""}
                  onChange={(event) => setValues((prev) => ({ ...prev, [question.id]: event.target.value }))}
                  placeholder={question.type === "essay" ? "Tulis jawabanmu…" : "Jawaban singkat"}
                />
              )}
            </CardContent>
          </Card>
        ))}

        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-muted-foreground">
            {answered} dari {questions.length} soal terisi.
          </p>
          <SubmitButton pendingLabel="Mengirim…" className="w-full">
            Kirim jawaban
          </SubmitButton>
        </div>
      </form>
    );
  }

  const graded = attempt.status === "graded";
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold">Hasil</p>
          <Badge variant={graded ? "success" : "warning"} className="text-[10px]">
            {graded ? "Sudah dinilai" : "Menunggu penilaian tutor"}
          </Badge>
        </div>
        {graded ? (
          <>
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Soal uraian pada tugas ini dinilai manual oleh tutor. Nilai akhir akan muncul setelah dinilai.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
