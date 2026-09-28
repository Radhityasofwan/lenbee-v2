"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
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
import { deleteDocumentAction, updateDocumentAction } from "@/app/actions/documents";
import { DOCUMENT_CATEGORY_LABELS } from "@/lib/domain/labels";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import type { DocumentFormProgram, DocumentFormStudent } from "@/components/document/document-upload-dialog";

const NO_STUDENT = "none";

export type EditableDocument = {
  id: number;
  title: string;
  description: string | null;
  studentId: number | null;
  programId: number | null;
  materialTag: string | null;
  category: string;
};

export function DocumentActions({
  document: doc,
  students,
  programs,
}: {
  document: EditableDocument;
  students: DocumentFormStudent[];
  programs: DocumentFormProgram[];
}) {
  const router = useRouter();
  const [openDialog, setOpenDialog] = useState<"edit" | "delete" | null>(null);
  const [studentId, setStudentId] = useState(doc.studentId ? String(doc.studentId) : NO_STUDENT);

  const [editState, editAction] = useActionState(updateDocumentAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteDocumentAction, idleState);

  useActionToast(editState, () => {
    setOpenDialog(null);
    router.refresh();
  });

  useActionToast(deleteState, () => {
    setOpenDialog(null);
    router.refresh();
  });

  const errors = editState.fieldErrors ?? {};
  const studentPrograms = programs.filter((program) => String(program.studentId) === studentId);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground"
        onClick={() => setOpenDialog("edit")}
        aria-label={`Ubah ${doc.title}`}
      >
        <Pencil />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-destructive"
        onClick={() => setOpenDialog("delete")}
        aria-label={`Hapus ${doc.title}`}
      >
        <Trash2 />
      </Button>

      <Dialog open={openDialog === "edit"} onOpenChange={(open) => setOpenDialog(open ? "edit" : null)}>
        <DialogContent>
          <form action={editAction} className="flex min-h-0 flex-1 flex-col">
            <input type="hidden" name="documentId" value={doc.id} />
            <DialogHeader>
              <DialogTitle>Ubah dokumen</DialogTitle>
              <DialogDescription>Perbarui keterangan dokumen. Berkas yang diunggah tidak diganti.</DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              {editState.message && !editState.ok ? <FormAlert tone="error">{editState.message}</FormAlert> : null}

              <FieldGroup>
                <Field label="Judul" htmlFor={`doc-title-${doc.id}`} error={errors.title} required>
                  <Input id={`doc-title-${doc.id}`} name="title" defaultValue={doc.title} required />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Kategori" htmlFor={`doc-category-${doc.id}`}>
                    <Select name="category" defaultValue={doc.category}>
                      <SelectTrigger id={`doc-category-${doc.id}`}>
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

                  <Field label="Murid" htmlFor={`doc-student-${doc.id}`} hint="Opsional">
                    <Select name="studentId" value={studentId} onValueChange={setStudentId}>
                      <SelectTrigger id={`doc-student-${doc.id}`}>
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
                  <Field label="Program" htmlFor={`doc-program-${doc.id}`} hint="Opsional">
                    <Select name="programId" defaultValue={doc.programId ? String(doc.programId) : "none"}>
                      <SelectTrigger id={`doc-program-${doc.id}`}>
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

                <Field label="Tag materi" htmlFor={`doc-tag-${doc.id}`} hint="Opsional">
                  <Input id={`doc-tag-${doc.id}`} name="materialTag" defaultValue={doc.materialTag ?? ""} />
                </Field>

                <Field label="Catatan" htmlFor={`doc-desc-${doc.id}`} hint="Opsional">
                  <Textarea id={`doc-desc-${doc.id}`} name="description" rows={2} defaultValue={doc.description ?? ""} />
                </Field>
              </FieldGroup>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openDialog === "delete"} onOpenChange={(open) => setOpenDialog(open ? "delete" : null)}>
        <DialogContent>
          <form action={deleteAction} className="flex min-h-0 flex-1 flex-col">
            <input type="hidden" name="documentId" value={doc.id} />
            <DialogHeader>
              <DialogTitle>Hapus dokumen?</DialogTitle>
              <DialogDescription>
                Berkas dan catatannya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {deleteState.message && !deleteState.ok ? (
                <FormAlert tone="error">{deleteState.message}</FormAlert>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                Batal
              </Button>
              <SubmitButton variant="destructive" pendingLabel="Menghapus…">
                Hapus permanen
              </SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
