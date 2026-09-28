"use client";

import { BookMarked, Plus, Save, Search, Sparkles, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { generateQuestionsAction, saveQuestionsAction } from "@/app/actions/assignments";
import {
  markBankQuestionsUsedAction,
  saveToBankAction,
  searchBankQuestionsAction,
} from "@/app/actions/question-bank";
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from "@/lib/domain/labels";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import type { BankQuestion, Question } from "@/db/schema";

type QuestionType = "multiple_choice" | "short_answer" | "essay";

type Draft = {
  key: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  correctAnswer: string;
  points: number;
  explanation: string;
};

type GeneratedQuestion = {
  type: string;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  points?: number;
  explanation?: string;
};

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `q${keyCounter}`;
}

function newDraft(type: QuestionType = "multiple_choice"): Draft {
  return {
    key: nextKey(),
    type,
    prompt: "",
    options: type === "multiple_choice" ? ["", ""] : [],
    correctAnswer: "",
    points: 1,
    explanation: "",
  };
}

function toDraft(question: Question | GeneratedQuestion): Draft {
  const type = (question.type as QuestionType) ?? "short_answer";
  return {
    key: nextKey(),
    type,
    prompt: question.prompt ?? "",
    options: type === "multiple_choice" ? (question.options ?? ["", ""]) : [],
    correctAnswer: question.correctAnswer ?? "",
    points: question.points ?? 1,
    explanation: question.explanation ?? "",
  };
}

function toPayload(drafts: Draft[]) {
  return drafts.map((draft) => ({
    type: draft.type,
    prompt: draft.prompt.trim(),
    options:
      draft.type === "multiple_choice"
        ? draft.options.map((option) => option.trim()).filter((option) => option.length > 0)
        : undefined,
    correctAnswer: draft.correctAnswer.trim(),
    points: draft.points,
    explanation: draft.explanation.trim(),
  }));
}

export function QuestionBuilder({
  assignmentId,
  studentId,
  studentLabel,
  initialQuestions,
  initialAiGenerated = false,
  attachableDocuments = [],
  subjectHint = "",
  materialHint = "",
  gradeHint = "",
}: {
  assignmentId: number;
  studentId: number;
  studentLabel: string;
  initialQuestions: Question[];
  initialAiGenerated?: boolean;
  attachableDocuments?: { id: number; title: string }[];
  subjectHint?: string;
  materialHint?: string;
  gradeHint?: string;
}) {
  const [questions, setQuestions] = useState<Draft[]>(() =>
    initialQuestions.length > 0 ? initialQuestions.map(toDraft) : [newDraft()],
  );
  const [openAi, setOpenAi] = useState(false);
  const [usedAi, setUsedAi] = useState(initialAiGenerated);
  const [openBankSave, setOpenBankSave] = useState(false);
  const [bankSelected, setBankSelected] = useState<Set<string>>(new Set());
  const [openBankPick, setOpenBankPick] = useState(false);
  const [pickedIds, setPickedIds] = useState<Set<number>>(new Set());

  const [saveState, saveFormAction] = useActionState(saveQuestionsAction, idleState);
  const [aiState, aiFormAction] = useActionState(generateQuestionsAction, idleState);
  const [bankSaveState, bankSaveFormAction] = useActionState(saveToBankAction, idleState);
  const [bankSearchState, bankSearchFormAction] = useActionState(searchBankQuestionsAction, idleState);

  useActionToast(saveState);

  useActionToast(aiState, () => {
    const generated = (aiState.data?.questions ?? []) as GeneratedQuestion[];
    if (generated.length === 0) return;

    const drafts = generated.map(toDraft);
    setQuestions((prev) => {
      const emptyOnly = prev.length === 1 && prev[0].prompt.trim() === "" && prev[0].correctAnswer.trim() === "";
      return emptyOnly ? drafts : [...prev, ...drafts];
    });
    if (aiState.data?.usedAi) setUsedAi(true);
    setOpenAi(false);
  });

  useActionToast(bankSaveState, () => setOpenBankSave(false));

  const patch = (key: string, changes: Partial<Draft>) => {
    setQuestions((prev) => prev.map((draft) => (draft.key === key ? { ...draft, ...changes } : draft)));
  };

  const totalPoints = questions.reduce((sum, draft) => sum + (Number.isFinite(draft.points) ? draft.points : 0), 0);
  const saveErrors = saveState.fieldErrors ?? {};
  const aiErrors = aiState.fieldErrors ?? {};
  const bankSaveErrors = bankSaveState.fieldErrors ?? {};

  const savableQuestions = questions.filter((draft) => draft.prompt.trim().length > 0);
  const bankResults = (bankSearchState.data?.results ?? []) as BankQuestion[];

  function openBankSaveDialog() {
    setBankSelected(new Set(savableQuestions.map((draft) => draft.key)));
    setOpenBankSave(true);
  }

  function toggleBankSelected(key: string) {
    setBankSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function togglePicked(id: number) {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addPickedToQuestions() {
    const picked = bankResults.filter((row) => pickedIds.has(row.id));
    if (picked.length === 0) return;

    const drafts = picked.map((row) =>
      toDraft({
        type: row.type,
        prompt: row.prompt,
        options: row.options ?? undefined,
        correctAnswer: row.correctAnswer ?? undefined,
        points: row.points,
        explanation: row.explanation ?? undefined,
      }),
    );
    setQuestions((prev) => {
      const emptyOnly = prev.length === 1 && prev[0].prompt.trim() === "" && prev[0].correctAnswer.trim() === "";
      return emptyOnly ? drafts : [...prev, ...drafts];
    });
    void markBankQuestionsUsedAction(picked.map((row) => row.id));
    setPickedIds(new Set());
    setOpenBankPick(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">Soal</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {questions.length} soal · {totalPoints} poin
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setOpenBankPick(true)}
          >
            <BookMarked />
            Ambil dari Bank
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={savableQuestions.length === 0}
            onClick={openBankSaveDialog}
          >
            <Save />
            Simpan ke Bank
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpenAi(true)}>
            <Sparkles />
            Buat dengan AI
          </Button>
        </div>
      </div>

      <Dialog open={openAi} onOpenChange={setOpenAi}>
        <DialogContent>
          <form action={aiFormAction}>
            <input type="hidden" name="studentId" value={studentId} />
            <DialogHeader>
              <DialogTitle>Buat soal dengan AI</DialogTitle>
              <DialogDescription>
                Soal dibuat untuk {studentLabel}. Hasilnya bisa Anda periksa dan ubah sebelum disimpan.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              {aiState.message && !aiState.ok ? <FormAlert tone="error">{aiState.message}</FormAlert> : null}

              <FieldGroup>
                <Field label="Mata pelajaran" htmlFor="aiSubject" error={aiErrors.subject} required>
                  <Input id="aiSubject" name="subject" placeholder="Contoh: Matematika" required />
                </Field>

                <Field label="Topik" htmlFor="aiTopic" error={aiErrors.topic} required>
                  <Input id="aiTopic" name="topic" placeholder="Contoh: Penjumlahan pecahan berbeda penyebut" required />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Jumlah soal" htmlFor="aiCount" error={aiErrors.count}>
                    <Input id="aiCount" name="count" type="number" min={1} max={20} defaultValue={5} />
                  </Field>
                  <Field label="Kesulitan" htmlFor="aiDifficulty" error={aiErrors.difficulty}>
                    <Select name="difficulty" defaultValue="medium">
                      <SelectTrigger id="aiDifficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {attachableDocuments.length > 0 ? (
                  <Field
                    label="Lampiran (opsional)"
                    htmlFor="aiDocument"
                    hint="Foto soal/buku atau PDF yang sudah diunggah — dijadikan sumber utama pembuatan soal."
                  >
                    <Select name="documentId" defaultValue="none">
                      <SelectTrigger id="aiDocument">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tanpa lampiran</SelectItem>
                        {attachableDocuments.map((document) => (
                          <SelectItem key={document.id} value={String(document.id)}>
                            {document.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}
              </FieldGroup>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenAi(false)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Membuat soal…">
                <Sparkles />
                Buat soal
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openBankSave} onOpenChange={setOpenBankSave}>
        <DialogContent>
          <form action={bankSaveFormAction}>
            <input
              type="hidden"
              name="questions"
              value={JSON.stringify(toPayload(savableQuestions.filter((draft) => bankSelected.has(draft.key))))}
            />
            <DialogHeader>
              <DialogTitle>Simpan ke Bank Soal</DialogTitle>
              <DialogDescription>Soal terpilih bisa dicari dan dipakai lagi untuk murid lain.</DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              {bankSaveState.message && !bankSaveState.ok ? (
                <FormAlert tone="error">{bankSaveState.message}</FormAlert>
              ) : null}

              <FieldGroup>
                <Field label="Mata pelajaran" htmlFor="bankSubject" error={bankSaveErrors.subject} required>
                  <Input id="bankSubject" name="subject" defaultValue={subjectHint} placeholder="Contoh: Matematika" required />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Kelas" htmlFor="bankGrade" hint="Opsional">
                    <Input id="bankGrade" name="grade" defaultValue={gradeHint} placeholder="Contoh: 3 SD" />
                  </Field>
                  <Field label="Kesulitan" htmlFor="bankDifficulty">
                    <Select name="difficulty" defaultValue="medium">
                      <SelectTrigger id="bankDifficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Materi/bab" htmlFor="bankMaterial" error={bankSaveErrors.material} required>
                  <Input id="bankMaterial" name="material" defaultValue={materialHint} placeholder="Contoh: Pecahan" required />
                </Field>
              </FieldGroup>

              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-muted-foreground">Pilih soal yang disimpan</p>
                {savableQuestions.map((draft) => (
                  <label key={draft.key} className="flex items-start gap-2 rounded-lg border border-border p-2.5 text-sm">
                    <Checkbox
                      checked={bankSelected.has(draft.key)}
                      onCheckedChange={() => toggleBankSelected(draft.key)}
                      className="mt-0.5"
                    />
                    <span className="line-clamp-2">{draft.prompt || "(kosong)"}</span>
                  </label>
                ))}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenBankSave(false)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Menyimpan…" disabled={bankSelected.size === 0}>
                <Save />
                Simpan {bankSelected.size > 0 ? bankSelected.size : ""} soal
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openBankPick} onOpenChange={setOpenBankPick}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ambil dari Bank Soal</DialogTitle>
            <DialogDescription>Cari soal lama lalu tambahkan ke tugas ini.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <form action={bankSearchFormAction} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input name="search" placeholder="Cari materi atau isi soal…" className="pl-9" defaultValue={materialHint} />
              </div>
              <SubmitButton variant="outline" pendingLabel="Mencari…">
                Cari
              </SubmitButton>
            </form>

            {bankSearchState.message ? (
              <p className="text-xs text-muted-foreground">{bankSearchState.message}</p>
            ) : null}

            <div className="flex flex-col gap-2">
              {bankResults.map((row) => (
                <label key={row.id} className="flex items-start gap-2 rounded-lg border border-border p-2.5 text-sm">
                  <Checkbox checked={pickedIds.has(row.id)} onCheckedChange={() => togglePicked(row.id)} className="mt-0.5" />
                  <span className="flex flex-col gap-0.5">
                    <span className="line-clamp-2">{row.prompt}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {row.subject} · {row.material}
                      {row.grade ? ` · ${row.grade}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpenBankPick(false)}>
              Batal
            </Button>
            <Button type="button" disabled={pickedIds.size === 0} onClick={addPickedToQuestions}>
              <Plus />
              Tambahkan {pickedIds.size > 0 ? pickedIds.size : ""} soal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form action={saveFormAction} className="flex flex-col gap-4">
        <input type="hidden" name="assignmentId" value={assignmentId} />
        <input type="hidden" name="questions" value={JSON.stringify(toPayload(questions))} />
        <input type="hidden" name="aiGenerated" value={usedAi ? "true" : "false"} />

        {saveState.message && !saveState.ok ? <FormAlert tone="error">{saveState.message}</FormAlert> : null}
        {saveErrors.questions ? <FormAlert tone="error">{saveErrors.questions}</FormAlert> : null}

        {questions.map((draft, index) => (
          <Card key={draft.key}>
            <CardContent className="flex flex-col gap-3 pt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-muted-foreground">Soal {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setQuestions((prev) => prev.filter((item) => item.key !== draft.key))}
                >
                  <Trash2 />
                  Hapus
                </Button>
              </div>

              <div className="grid grid-cols-[1fr_5rem] gap-3">
                <Field label="Tipe" htmlFor={`type-${draft.key}`}>
                  <Select
                    value={draft.type}
                    onValueChange={(value) =>
                      patch(draft.key, {
                        type: value as QuestionType,
                        options: value === "multiple_choice" ? (draft.options.length > 0 ? draft.options : ["", ""]) : [],
                      })
                    }
                  >
                    <SelectTrigger id={`type-${draft.key}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Poin" htmlFor={`points-${draft.key}`}>
                  <Input
                    id={`points-${draft.key}`}
                    type="number"
                    min={1}
                    max={100}
                    value={draft.points}
                    onChange={(event) => patch(draft.key, { points: Number(event.target.value) })}
                  />
                </Field>
              </div>

              <Field label="Pertanyaan" htmlFor={`prompt-${draft.key}`}>
                <Textarea
                  id={`prompt-${draft.key}`}
                  rows={2}
                  value={draft.prompt}
                  onChange={(event) => patch(draft.key, { prompt: event.target.value })}
                  placeholder="Tulis pertanyaannya…"
                />
              </Field>

              {draft.type === "multiple_choice" ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Pilihan jawaban</p>
                  {draft.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(event) => {
                          const next = [...draft.options];
                          next[optionIndex] = event.target.value;
                          patch(draft.key, { options: next });
                        }}
                        placeholder={`Opsi ${optionIndex + 1}`}
                      />
                      {draft.options.length > 2 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            patch(draft.key, { options: draft.options.filter((_, i) => i !== optionIndex) })
                          }
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  {draft.options.length < 8 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 self-start text-xs"
                      onClick={() => patch(draft.key, { options: [...draft.options, ""] })}
                    >
                      <Plus />
                      Tambah opsi
                    </Button>
                  ) : null}
                </div>
              ) : null}

              <Field
                label={draft.type === "essay" ? "Kunci / pembahasan" : "Kunci jawaban"}
                htmlFor={`answer-${draft.key}`}
                hint={
                  draft.type === "essay"
                    ? "Soal uraian dinilai manual, kunci ini hanya sebagai catatan Anda."
                    : "Tulis persis seperti salah satu opsi. Beberapa jawaban benar dipisah dengan |"
                }
              >
                <Input
                  id={`answer-${draft.key}`}
                  value={draft.correctAnswer}
                  onChange={(event) => patch(draft.key, { correctAnswer: event.target.value })}
                  placeholder={draft.type === "essay" ? "Opsional" : "Contoh: 3/4"}
                />
              </Field>

              <Field label="Pembahasan" htmlFor={`explanation-${draft.key}`} hint="Dibaca murid setelah dinilai.">
                <Textarea
                  id={`explanation-${draft.key}`}
                  rows={2}
                  value={draft.explanation}
                  onChange={(event) => patch(draft.key, { explanation: event.target.value })}
                  placeholder="Opsional"
                />
              </Field>
            </CardContent>
          </Card>
        ))}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 text-xs"
            onClick={() => setQuestions((prev) => [...prev, newDraft()])}
          >
            <Plus />
            Tambah soal
          </Button>
          <SubmitButton pendingLabel="Menyimpan…" className="h-9 flex-1 text-xs sm:flex-none">
            Simpan soal
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
