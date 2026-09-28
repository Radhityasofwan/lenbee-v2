"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { createAssignmentAction, updateAssignmentAction } from "@/app/actions/assignments";
import { ASSIGNMENT_STATUS_LABELS, DIFFICULTY_LABELS } from "@/lib/domain/labels";
import { idleState } from "@/lib/form";
import type { Assignment } from "@/db/schema";

export type ProgramOption = {
  id: number;
  name: string;
  studentId: number;
  studentName: string;
};

export function AssignmentForm({
  students,
  programs,
  assignment,
}: {
  students: { id: number; name: string; nickname: string | null }[];
  programs: ProgramOption[];
  assignment?: Assignment;
}) {
  const editing = Boolean(assignment);
  const [state, formAction] = useActionState(
    editing ? updateAssignmentAction : createAssignmentAction,
    idleState,
  );
  const errors = state.fieldErrors ?? {};

  const [studentId, setStudentId] = useState(assignment ? String(assignment.studentId) : "");
  const [programId, setProgramId] = useState(assignment?.programId ? String(assignment.programId) : "");

  const studentPrograms = programs.filter((program) => String(program.studentId) === studentId);

  if (students.length === 0) {
    return (
      <FormAlert tone="error">
        Belum ada murid aktif. Tambahkan murid terlebih dahulu sebelum membuat tugas.
      </FormAlert>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {assignment ? <input type="hidden" name="assignmentId" value={assignment.id} /> : null}
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <FieldGroup>
        <Field label="Murid" htmlFor="studentId" error={errors.studentId} required>
          <Select
            name="studentId"
            value={studentId}
            onValueChange={(value) => {
              setStudentId(value);
              setProgramId("");
            }}
          >
            <SelectTrigger id="studentId">
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

        <Field
          label="Program"
          htmlFor="programId"
          error={errors.programId}
          hint={studentId ? undefined : "Pilih murid dulu untuk melihat programnya."}
        >
          <Select name="programId" value={programId} onValueChange={setProgramId} disabled={!studentId}>
            <SelectTrigger id="programId">
              <SelectValue placeholder={studentPrograms.length === 0 ? "Tanpa program" : "Pilih program"} />
            </SelectTrigger>
            <SelectContent>
              {studentPrograms.map((program) => (
                <SelectItem key={program.id} value={String(program.id)}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Judul tugas" htmlFor="title" error={errors.title} required>
          <Input
            id="title"
            name="title"
            defaultValue={assignment?.title ?? ""}
            placeholder="Contoh: Latihan pecahan campuran"
            required
          />
        </Field>

        <Field label="Materi" htmlFor="material" error={errors.material} hint="Topik singkat yang diujikan.">
          <Input id="material" name="material" defaultValue={assignment?.material ?? ""} placeholder="Contoh: Pecahan" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Tingkat kesulitan" htmlFor="difficulty" error={errors.difficulty}>
            <Select name="difficulty" defaultValue={assignment?.difficulty ?? "medium"}>
              <SelectTrigger id="difficulty">
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

          <Field label="Status" htmlFor="status" error={errors.status}>
            <Select name="status" defaultValue={assignment?.status ?? "draft"}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field
          label="Instruksi"
          htmlFor="instructions"
          error={errors.instructions}
          hint="Petunjuk pengerjaan yang dibaca murid dan orang tua."
        >
          <Textarea
            id="instructions"
            name="instructions"
            rows={3}
            defaultValue={assignment?.instructions ?? ""}
            placeholder="Kerjakan tanpa kalkulator, tulis langkah pengerjaannya…"
          />
        </Field>
      </FieldGroup>

      <div className="flex gap-2">
        <SubmitButton pendingLabel="Menyimpan…" className="flex-1">
          {editing ? "Simpan perubahan" : "Simpan tugas"}
        </SubmitButton>
        {editing ? (
          <Button type="reset" variant="outline" className="flex-1">
            Reset
          </Button>
        ) : null}
      </div>
    </form>
  );
}
