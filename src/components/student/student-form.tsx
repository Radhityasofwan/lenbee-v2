"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { StudentAvatar } from "@/components/student-avatar";
import { createStudentAction, updateStudentAction } from "@/app/actions/students";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { ACCENT_COLORS, accentOf } from "@/lib/domain/colors";
import { REPORT_FORMAT_LABELS } from "@/lib/domain/labels";
import { cn } from "@/lib/utils";
import type { Student } from "@/db/schema";

export function StudentForm({ student }: { student?: Student }) {
  const router = useRouter();
  const editing = Boolean(student);
  const [state, formAction] = useActionState(
    editing ? updateStudentAction : createStudentAction,
    idleState,
  );
  const errors = state.fieldErrors ?? {};
  const [name, setName] = useState(student?.name ?? "");
  const [color, setColor] = useState(student?.color ?? "violet");

  useActionToast(state, () => router.refresh());

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {student ? <input type="hidden" name="studentId" value={student.id} /> : null}
      {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

      <div className="flex items-center gap-3">
        <StudentAvatar name={name || "?"} color={color} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{name || "Murid baru"}</p>
          <p className="text-xs text-muted-foreground">Warna dipakai untuk menandai murid ini di jadwal.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACCENT_COLORS.map((option) => {
          const accent = accentOf(option);
          const selected = option === color;
          return (
            <button
              key={option}
              type="button"
              aria-label={accent.label}
              aria-pressed={selected}
              onClick={() => setColor(option)}
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-transform",
                accent.solid,
                selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-70",
              )}
            >
              {selected ? <Check className="size-4 text-white" /> : null}
            </button>
          );
        })}
      </div>
      <input type="hidden" name="color" value={color} />

      <FieldGroup>
        <Field label="Nama lengkap" htmlFor="name" error={errors.name} required>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nama murid"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nama panggilan" htmlFor="nickname" error={errors.nickname}>
            <Input id="nickname" name="nickname" defaultValue={student?.nickname ?? ""} placeholder="Opsional" />
          </Field>
          <Field label="Tanggal lahir" htmlFor="birthDate" error={errors.birthDate}>
            <Input id="birthDate" name="birthDate" type="date" defaultValue={student?.birthDate ?? ""} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Sekolah" htmlFor="school" error={errors.school}>
            <Input id="school" name="school" defaultValue={student?.school ?? ""} placeholder="SD / SMP / SMA" />
          </Field>
          <Field label="Kelas" htmlFor="grade" error={errors.grade}>
            <Input id="grade" name="grade" defaultValue={student?.grade ?? ""} placeholder="Contoh: 5" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Tanggal mulai periode"
            htmlFor="periodStart"
            error={errors.periodStart}
            hint="Default tanggal mulai & akhir saat membuat jadwal dan rangkuman untuk anak ini."
          >
            <Input id="periodStart" name="periodStart" type="date" defaultValue={student?.periodStart ?? ""} />
          </Field>
          <Field label="Tanggal akhir periode" htmlFor="periodEnd" error={errors.periodEnd}>
            <Input id="periodEnd" name="periodEnd" type="date" defaultValue={student?.periodEnd ?? ""} />
          </Field>
        </div>

        <Field
          label="Format laporan"
          htmlFor="reportFormat"
          error={errors.reportFormat}
          hint="Dipakai sebagai default saat membuat laporan baru untuk anak ini. Bisa diubah per laporan."
        >
          <Select name="reportFormat" defaultValue={student?.reportFormat ?? "narrative"}>
            <SelectTrigger id="reportFormat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REPORT_FORMAT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <div className="border-t border-border pt-4">
        <h2 className="mb-3 text-sm font-bold">Orang tua / wali</h2>
        <FieldGroup>
          <Field label="Nama orang tua" htmlFor="parentName" error={errors.parentName}>
            <Input id="parentName" name="parentName" defaultValue={student?.parentName ?? ""} />
          </Field>

          <Field label="Nomor WhatsApp orang tua" htmlFor="parentPhone" error={errors.parentPhone}>
            <Input
              id="parentPhone"
              name="parentPhone"
              type="tel"
              inputMode="tel"
              defaultValue={student?.parentPhone ?? ""}
              placeholder="08xxxxxxxxxx"
            />
          </Field>

          <Field
            label="Email orang tua"
            htmlFor="parentEmail"
            error={errors.parentEmail}
            hint="Jika email ini sudah terdaftar sebagai akun orang tua, akses langsung tersambung."
          >
            <Input
              id="parentEmail"
              name="parentEmail"
              type="email"
              inputMode="email"
              defaultValue={student?.parentEmail ?? ""}
            />
          </Field>
        </FieldGroup>
      </div>

      <Field label="Catatan" htmlFor="notes" error={errors.notes} hint="Kebutuhan khusus, target, atau info lain. Tidak dibaca orang tua.">
        <Textarea id="notes" name="notes" rows={3} defaultValue={student?.notes ?? ""} />
      </Field>

      <Field label="Status" error={errors.isActive}>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
          <Checkbox name="isActive" value="on" defaultChecked={student?.isActive ?? true} className="mt-0.5" />
          <span className="text-sm leading-snug">
            Murid aktif
            <span className="block text-xs text-muted-foreground">
              Nonaktifkan bila sudah berhenti les — riwayat dan tagihan tetap tersimpan.
            </span>
          </span>
        </label>
      </Field>

      <div className="flex gap-2">
        <SubmitButton pendingLabel="Menyimpan…" className="flex-1">
          {editing ? "Simpan perubahan" : "Simpan murid"}
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
