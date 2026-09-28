"use client";

import { Loader2, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { createDocumentAction } from "@/app/actions/documents";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/domain/labels";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

const NO_STUDENT = "none";

export type DocumentFormStudent = { id: number; name: string; nickname: string | null };
export type DocumentFormProgram = { id: number; name: string; studentId: number };

export function DocumentUploadDialog({
  students,
  programs,
  defaultStudentId,
}: {
  students: DocumentFormStudent[];
  programs: DocumentFormProgram[];
  defaultStudentId?: number;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createDocumentAction, idleState);
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState(defaultStudentId ? String(defaultStudentId) : NO_STUDENT);
  const formRef = useRef<HTMLFormElement>(null);

  useActionToast(state, () => {
    formRef.current?.reset();
    setStudentId(defaultStudentId ? String(defaultStudentId) : NO_STUDENT);
    setOpen(false);
    router.refresh();
  });

  const errors = state.fieldErrors ?? {};
  const studentPrograms = programs.filter((program) => String(program.studentId) === studentId);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Unggah
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form ref={formRef} action={formAction} className="flex min-h-0 flex-1 flex-col">
            <DialogHeader>
              <DialogTitle>Unggah dokumen</DialogTitle>
              <DialogDescription>
                Simpan worksheet, soal, rangkuman, atau dokumen sekolah agar mudah dicari kembali.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

              <FieldGroup>
                <Field label="Judul" htmlFor="document-title" error={errors.title} required>
                  <Input id="document-title" name="title" placeholder="Contoh: Worksheet pecahan kelas 4" required />
                </Field>

                <Field label="Berkas" htmlFor="document-file" error={errors.file} required>
                  <input
                    id="document-file"
                    type="file"
                    name="file"
                    required
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    className="w-full rounded-lg border border-input bg-transparent p-2 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Kategori" htmlFor="document-category">
                    <Select name="category" defaultValue="worksheet">
                      <SelectTrigger id="document-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Murid" htmlFor="document-student" hint="Opsional">
                    <Select name="studentId" value={studentId} onValueChange={setStudentId}>
                      <SelectTrigger id="document-student">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_STUDENT}>Tanpa murid</SelectItem>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={String(student.id)}>
                            {student.nickname || student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {studentPrograms.length > 0 ? (
                  <Field label="Program" htmlFor="document-program" hint="Opsional">
                    <Select name="programId" defaultValue="none">
                      <SelectTrigger id="document-program">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tanpa program</SelectItem>
                        {studentPrograms.map((program) => (
                          <SelectItem key={program.id} value={String(program.id)}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}

                <Field label="Tag materi" htmlFor="document-tag" hint="Opsional" error={errors.materialTag}>
                  <Input id="document-tag" name="materialTag" placeholder="Contoh: Pecahan" />
                </Field>

                <Field label="Catatan" htmlFor="document-description" hint="Opsional" error={errors.description}>
                  <Textarea id="document-description" name="description" rows={2} placeholder="Keterangan singkat" />
                </Field>
              </FieldGroup>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Mengunggah…">
                {pending ? <Loader2 className="animate-spin" /> : <Upload />}
                Unggah
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
