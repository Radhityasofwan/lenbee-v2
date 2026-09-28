"use client";

import { Sparkles, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { deleteBankQuestionAction, generateBankVariantAction } from "@/app/actions/question-bank";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from "@/lib/domain/labels";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import type { BankQuestion } from "@/db/schema";

export function BankQuestionItem({ question }: { question: BankQuestion }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [variantState, variantAction] = useActionState(generateBankVariantAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteBankQuestionAction, idleState);

  useActionToast(variantState);
  useActionToast(deleteState, () => setConfirmDelete(false));

  return (
    <Card>
      <CardContent className="flex flex-col gap-2.5 pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {question.subject}
          </Badge>
          {question.grade ? (
            <Badge variant="outline" className="text-[10px]">
              {question.grade}
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-[10px]">
            {question.material}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {QUESTION_TYPE_LABELS[question.type]}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {DIFFICULTY_LABELS[question.difficulty]}
          </Badge>
          {question.usageCount > 0 ? (
            <span className="ml-auto text-[10px] text-muted-foreground">
              Dipakai {question.usageCount}×
            </span>
          ) : null}
        </div>

        <p className="text-sm font-medium text-foreground">{question.prompt}</p>

        {question.options?.length ? (
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {question.options.map((option, index) => (
              <li key={index} className={option === question.correctAnswer ? "font-semibold text-foreground" : ""}>
                {String.fromCharCode(65 + index)}. {option}
              </li>
            ))}
          </ul>
        ) : question.correctAnswer ? (
          <p className="text-xs text-muted-foreground">Kunci: {question.correctAnswer}</p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <form action={variantAction}>
            <input type="hidden" name="id" value={question.id} />
            <input type="hidden" name="count" value={3} />
            <SubmitButton variant="outline" size="sm" className="h-8 text-xs" pendingLabel="Membuat variasi…">
              <Sparkles />
              Buat 3 variasi
            </SubmitButton>
          </form>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
            Hapus
          </Button>
        </div>
      </CardContent>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={question.id} />
            <DialogHeader>
              <DialogTitle>Hapus soal ini?</DialogTitle>
              <DialogDescription>Soal akan hilang dari Bank Soal. Tugas yang sudah memakainya tidak berubah.</DialogDescription>
            </DialogHeader>
            <DialogBody />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Batal
              </Button>
              <SubmitButton variant="destructive" pendingLabel="Menghapus…">
                Hapus
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
