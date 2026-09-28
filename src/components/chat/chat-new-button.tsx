"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { createChatSessionAction } from "@/app/actions/ai-chat";
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
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/form";

export function ChatNewButton({ students }: { students: { id: number; name: string; nickname: string | null }[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createChatSessionAction, idleState);

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Percakapan baru
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form action={action}>
            <DialogHeader>
              <DialogTitle>Percakapan baru</DialogTitle>
              <DialogDescription>Pilih murid dulu supaya Asisten tahu kelas dan konteksnya.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}
              <Field label="Murid" htmlFor="chatStudentId" error={state.fieldErrors?.studentId} required>
                <Select name="studentId" defaultValue={String(students[0]?.id ?? "")}>
                  <SelectTrigger id="chatStudentId">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={String(student.id)}>
                        {student.nickname || student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <SubmitButton pendingLabel="Membuat…">Mulai obrolan</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
