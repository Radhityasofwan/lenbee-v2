"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createParentAction,
  deleteAccountAction,
  updateParentAction,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
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
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

export type StudentOption = { id: number; name: string; tutorName: string };

export type EditableParent = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  activeUntil: Date | null;
  linkedStudents: { id: number; name: string }[];
};

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function ParentAccountDialog({
  parent,
  studentOptions,
}: {
  parent?: EditableParent;
  studentOptions: StudentOption[];
}) {
  const router = useRouter();
  const isEdit = Boolean(parent);

  const [openDialog, setOpenDialog] = useState<"form" | "delete" | null>(null);
  const [createState, createAction] = useActionState(createParentAction, idleState);
  const [updateState, updateAction] = useActionState(updateParentAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteAccountAction, idleState);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(parent?.linkedStudents.map((s) => s.id) ?? []),
  );

  useActionToast([createState, updateState, deleteState].find((state) => state.message) ?? idleState, () => {
    setOpenDialog(null);
    setConfirmEmail("");
    router.refresh();
  });

  const activeState = isEdit ? updateState : createState;
  const errors = activeState.fieldErrors ?? {};
  const action = isEdit ? updateAction : createAction;

  function toggleStudent(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      {isEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => setOpenDialog("form")}
          aria-label={`Ubah ${parent?.name}`}
        >
          <Pencil />
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpenDialog("form")}>
          <Plus />
          Tambah orang tua
        </Button>
      )}

      <Dialog open={openDialog === "form"} onOpenChange={(open) => setOpenDialog(open ? "form" : null)}>
        <DialogContent className="sm:max-w-lg">
          <form action={action} className="flex min-h-0 flex-1 flex-col">
            {isEdit ? <input type="hidden" name="accountId" value={parent?.id} /> : null}
            {[...selectedIds].map((id) => (
              <input key={id} type="hidden" name="studentIds" value={id} />
            ))}
            <DialogHeader>
              <DialogTitle>{isEdit ? "Ubah akun orang tua" : "Tambah akun orang tua"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "Perbarui data akun ini." : "Buat akun baru — beri tahu password ini ke orang tua secara langsung."}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
              {activeState.message && !activeState.ok ? <FormAlert tone="error">{activeState.message}</FormAlert> : null}
              <FieldGroup>
                <Field label="Nama" htmlFor="parent-name" error={errors.name} required>
                  <Input id="parent-name" name="name" defaultValue={parent?.name} required />
                </Field>
                <Field label="Email" htmlFor="parent-email" error={errors.email} required>
                  <Input id="parent-email" name="email" type="email" defaultValue={parent?.email} required />
                </Field>
                <Field label="Nomor telepon" htmlFor="parent-phone" error={errors.phone}>
                  <Input id="parent-phone" name="phone" defaultValue={parent?.phone ?? ""} />
                </Field>
                {!isEdit ? (
                  <Field label="Password" htmlFor="parent-password" error={errors.password} required>
                    <Input id="parent-password" name="password" type="password" minLength={8} required />
                  </Field>
                ) : null}
                <Field
                  label="Masa aktif sampai"
                  htmlFor="parent-active-until"
                  hint="Kosongkan untuk tanpa batas waktu."
                  error={errors.activeUntil}
                >
                  <Input
                    id="parent-active-until"
                    name="activeUntil"
                    type="date"
                    defaultValue={toDateInputValue(parent?.activeUntil ?? null)}
                  />
                </Field>
              </FieldGroup>

              <Field label="Anak yang tertaut" error={errors.studentIds}>
                {studentOptions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Belum ada murid di sistem.
                  </p>
                ) : (
                  <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-1.5">
                    {studentOptions.map((student) => (
                      <li key={student.id}>
                        <label className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted">
                          <Checkbox
                            checked={selectedIds.has(student.id)}
                            onCheckedChange={() => toggleStudent(student.id)}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm">{student.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{student.tutorName}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </Field>
            </DialogBody>
            <DialogFooter>
              {isEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="mr-auto text-muted-foreground hover:text-destructive"
                  onClick={() => setOpenDialog("delete")}
                >
                  <Trash2 />
                  Hapus
                </Button>
              ) : null}
              <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isEdit ? (
        <Dialog
          open={openDialog === "delete"}
          onOpenChange={(open) => {
            setOpenDialog(open ? "delete" : null);
            if (!open) setConfirmEmail("");
          }}
        >
          <DialogContent>
            <form action={deleteAction}>
              <input type="hidden" name="accountId" value={parent?.id} />
              <DialogHeader>
                <DialogTitle>Hapus akun orang tua?</DialogTitle>
                <DialogDescription>
                  Akun ini akan kehilangan akses ke seluruh anak yang tertaut. Tindakan ini tidak bisa dibatalkan.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                {deleteState.message && !deleteState.ok ? <FormAlert tone="error">{deleteState.message}</FormAlert> : null}
                <Field label={`Ketik "${parent?.email}" untuk konfirmasi`} htmlFor="parent-confirm-email" required>
                  <Input
                    id="parent-confirm-email"
                    name="confirmEmail"
                    value={confirmEmail}
                    onChange={(event) => setConfirmEmail(event.target.value)}
                    autoComplete="off"
                    required
                  />
                </Field>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpenDialog(null)}>
                  Batal
                </Button>
                <SubmitButton
                  variant="destructive"
                  pendingLabel="Menghapus…"
                  disabled={confirmEmail.trim().toLowerCase() !== parent?.email.toLowerCase()}
                >
                  Hapus permanen
                </SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
