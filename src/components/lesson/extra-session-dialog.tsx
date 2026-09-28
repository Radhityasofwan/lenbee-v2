"use client";

import { CalendarPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { extraSessionAction } from "@/app/actions/lessons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";

export type SessionProgramOption = {
  id: number;
  name: string;
  studentId: number;
  defaultDurationMinutes: number;
};

export type SessionStudentOption = { id: number; name: string; nickname: string | null };

export function ExtraSessionDialog({
  students,
  programs,
  defaultDate,
}: {
  students: SessionStudentOption[];
  programs: SessionProgramOption[];
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [programId, setProgramId] = useState("");
  const [duration, setDuration] = useState("60");
  const [state, formAction] = useActionState(extraSessionAction, idleState);

  useActionToast(state, () => setOpen(false));

  const options = programs.filter((program) => String(program.studentId) === studentId);

  const openDialog = () => {
    const first = students[0];
    setStudentId(first ? String(first.id) : "");
    const firstProgram = programs.find((program) => program.studentId === first?.id);
    setProgramId(firstProgram ? String(firstProgram.id) : "");
    setDuration(String(firstProgram?.defaultDurationMinutes ?? 60));
    setOpen(true);
  };

  const onStudentChange = (value: string) => {
    setStudentId(value);
    const next = programs.find((program) => String(program.studentId) === value);
    setProgramId(next ? String(next.id) : "");
    if (next) setDuration(String(next.defaultDurationMinutes));
  };

  const disabled = students.length === 0 || programs.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled} onClick={openDialog}>
          <CalendarPlus className="size-4" />
          Sesi tambahan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pertemuan tambahan</DialogTitle>
          <DialogDescription>
            Untuk les di luar jadwal rutin. Pertemuan ini langsung masuk ke riwayat, tagihan, dan laporan orang tua.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <form action={formAction} className="flex flex-col gap-4">
            {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}
            <FieldGroup>
              <Field label="Murid" error={state.fieldErrors?.studentId}>
                <Select name="studentId" value={studentId} onValueChange={onStudentChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih murid" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={String(student.id)}>
                        {student.nickname ? `${student.name} (${student.nickname})` : student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Program" error={state.fieldErrors?.programId}>
                <Select name="programId" value={programId} onValueChange={setProgramId} disabled={options.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih program" />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((program) => (
                      <SelectItem key={program.id} value={String(program.id)}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tanggal" error={state.fieldErrors?.date}>
                  <Input name="date" type="date" defaultValue={defaultDate} required />
                </Field>
                <Field label="Jam mulai" error={state.fieldErrors?.startTime}>
                  <Input name="startTime" type="time" defaultValue="15:00" required />
                </Field>
              </div>

              <Field label="Durasi (menit)" error={state.fieldErrors?.durationMinutes}>
                <Input
                  name="durationMinutes"
                  type="number"
                  min={5}
                  max={600}
                  step={5}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  required
                />
              </Field>

              <Field label="Catatan" hint="Opsional" error={state.fieldErrors?.notes}>
                <Textarea name="notes" rows={2} placeholder="Misal: ganti jadwal karena ujian sekolah" />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <SubmitButton pendingLabel="Menyimpan…">Simpan pertemuan</SubmitButton>
            </DialogFooter>
          </form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
