"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTutorAction,
  deleteAccountAction,
  updateTutorAction,
} from "@/app/actions/admin";
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
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

export type EditableTutor = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  activeUntil: Date | null;
};

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function TutorAccountDialog({ tutor }: { tutor?: EditableTutor }) {
  const router = useRouter();
  const isEdit = Boolean(tutor);

  const [openDialog, setOpenDialog] = useState<"form" | "delete" | null>(null);
  const [createState, createAction] = useActionState(createTutorAction, idleState);
  const [updateState, updateAction] = useActionState(updateTutorAction, idleState);
  const [deleteState, deleteAction] = useActionState(deleteAccountAction, idleState);
  const [confirmEmail, setConfirmEmail] = useState("");

  useActionToast([createState, updateState, deleteState].find((state) => state.message) ?? idleState, () => {
    setOpenDialog(null);
    setConfirmEmail("");
    router.refresh();
  });

  const activeState = isEdit ? updateState : createState;
  const errors = activeState.fieldErrors ?? {};
  const action = isEdit ? updateAction : createAction;

  return (
    <>
      {isEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => setOpenDialog("form")}
          aria-label={`Ubah ${tutor?.name}`}
        >
          <Pencil />
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpenDialog("form")}>
          <Plus />
          Tambah tutor
        </Button>
      )}

      <Dialog open={openDialog === "form"} onOpenChange={(open) => setOpenDialog(open ? "form" : null)}>
        <DialogContent>
          <form action={action}>
            {isEdit ? <input type="hidden" name="accountId" value={tutor?.id} /> : null}
            <DialogHeader>
              <DialogTitle>{isEdit ? "Ubah akun tutor" : "Tambah akun tutor"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "Perbarui data akun ini." : "Buat akun baru — beri tahu password ini ke tutor secara langsung."}
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              {activeState.message && !activeState.ok ? <FormAlert tone="error">{activeState.message}</FormAlert> : null}
              <FieldGroup>
                <Field label="Nama" htmlFor="tutor-name" error={errors.name} required>
                  <Input id="tutor-name" name="name" defaultValue={tutor?.name} required />
                </Field>
                <Field label="Email" htmlFor="tutor-email" error={errors.email} required>
                  <Input id="tutor-email" name="email" type="email" defaultValue={tutor?.email} required />
                </Field>
                <Field label="Nomor telepon" htmlFor="tutor-phone" error={errors.phone}>
                  <Input id="tutor-phone" name="phone" defaultValue={tutor?.phone ?? ""} />
                </Field>
                {!isEdit ? (
                  <Field label="Password" htmlFor="tutor-password" error={errors.password} required>
                    <Input id="tutor-password" name="password" type="password" minLength={8} required />
                  </Field>
                ) : null}
                <Field
                  label="Masa aktif sampai"
                  htmlFor="tutor-active-until"
                  hint="Kosongkan untuk tanpa batas waktu."
                  error={errors.activeUntil}
                >
                  <Input
                    id="tutor-active-until"
                    name="activeUntil"
                    type="date"
                    defaultValue={toDateInputValue(tutor?.activeUntil ?? null)}
                  />
                </Field>
              </FieldGroup>
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
              <input type="hidden" name="accountId" value={tutor?.id} />
              <DialogHeader>
                <DialogTitle>Hapus akun tutor?</DialogTitle>
                <DialogDescription>
                  Semua data tutor ini — murid, jadwal, laporan, invoice — ikut terhapus permanen. Tindakan ini tidak
                  bisa dibatalkan.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                {deleteState.message && !deleteState.ok ? <FormAlert tone="error">{deleteState.message}</FormAlert> : null}
                <Field label={`Ketik "${tutor?.email}" untuk konfirmasi`} htmlFor="tutor-confirm-email" required>
                  <Input
                    id="tutor-confirm-email"
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
                  disabled={confirmEmail.trim().toLowerCase() !== tutor?.email.toLowerCase()}
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
