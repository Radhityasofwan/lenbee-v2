"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarPlus, Check, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ACCENT_COLORS, accentOf } from "@/lib/domain/colors";
import { RATE_UNIT_LABELS, labelOf } from "@/lib/domain/labels";
import {
  DAY_NAMES_ID,
  addMinutesToTime,
  formatCurrency,
  formatDateShort,
  formatDuration,
  timeRangeLabel,
  todayKey,
} from "@/lib/datetime";
import { idleState, type ActionState } from "@/lib/form";
import { cn } from "@/lib/utils";
import {
  createProgramAction,
  createScheduleAction,
  deleteProgramAction,
  deleteScheduleAction,
  updateProgramAction,
  updateScheduleAction,
} from "@/app/actions/students";
import type { Program, Schedule } from "@/db/schema";
import { useActionToast } from "@/lib/hooks/use-action-toast";

type ProgramOption = Pick<Program, "id" | "name" | "subject">;
type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const FREQUENCY_LABELS: Record<string, string> = { weekly: "Setiap minggu", biweekly: "Dua mingguan" };

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-3 text-xs text-muted-foreground">{children}</p>;
}

function SectionDialog({
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function RowButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-border p-2.5 text-left transition-colors hover:bg-muted/50"
    >
      {children}
    </button>
  );
}

function DeleteFormButton({
  action,
  hidden,
  label,
  onDone,
}: {
  action: FormAction;
  hidden: Record<string, string | number>;
  label: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const [pending, startTransition] = useTransition();
  useActionToast(state, onDone);

  // Tanpa <form> sendiri: tombol ini juga dipakai di dalam form dialog, dan <form> bersarang bikin hydration error.
  const submit = () => {
    const data = new FormData();
    for (const [key, value] of Object.entries(hidden)) data.set(key, String(value));
    startTransition(() => formAction(data));
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={submit}
      disabled={pending}
      className={cn("text-destructive", label ? "sm:mr-auto" : "size-8 shrink-0 p-0")}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="size-4" />}
      {label}
    </Button>
  );
}

/* --------------------------------- Program -------------------------------- */

/** "3× seminggu" sesuai dokumentasi §3 — dihitung dari jadwal rutin aktif program tersebut. */
function weeklyFrequencyLabel(schedules: Schedule[], programId: number): string | null {
  const rows = schedules.filter((schedule) => schedule.programId === programId && schedule.isActive);
  if (rows.length === 0) return null;
  const weekly = rows.filter((schedule) => schedule.frequency === "weekly").length;
  const biweekly = rows.length - weekly;
  if (weekly === 0) return `${biweekly}× dua mingguan`;
  const parts = [`${weekly}× seminggu`];
  if (biweekly > 0) parts.push(`+${biweekly}× dua mingguan`);
  return parts.join(" ");
}

export function ProgramSection({
  studentId,
  programs,
  schedules,
}: {
  studentId: number;
  programs: Program[];
  schedules: Schedule[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Program | null>(null);
  const [color, setColor] = useState("sky");
  const [state, formAction] = useActionState(editing ? updateProgramAction : createProgramAction, idleState);
  useActionToast(state, () => setOpen(false));

  const openDialog = (program: Program | null) => {
    setEditing(program);
    setColor(program?.color ?? "sky");
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Program les</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => openDialog(null)}
        >
          <Plus className="size-3.5" />
          Tambah
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {programs.length === 0 ? (
          <EmptyRow>Belum ada program. Tambahkan mata pelajaran dan tarifnya.</EmptyRow>
        ) : (
          programs.map((program) => {
            const accent = accentOf(program.color);
            const frequency = weeklyFrequencyLabel(schedules, program.id);
            return (
              <RowButton key={program.id} onClick={() => openDialog(program)}>
                <span className={cn("size-2.5 shrink-0 rounded-full", accent.solid)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{program.name}</span>
                    {frequency ? (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {frequency}
                      </Badge>
                    ) : null}
                    {program.isActive ? null : (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        Nonaktif
                      </Badge>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {program.subject} · {formatCurrency(program.rate)} {labelOf(RATE_UNIT_LABELS, program.rateUnit)} ·{" "}
                    {formatDuration(program.defaultDurationMinutes)}
                  </span>
                </span>
              </RowButton>
            );
          })
        )}
      </CardContent>

      <SectionDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Ubah program" : "Program baru"}
        description="Tarif dipakai saat membuat tagihan dari pertemuan yang selesai."
      >
        <form action={formAction} className="flex flex-col gap-4 pb-4">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="color" value={color} />
          {editing ? <input type="hidden" name="programId" value={editing.id} /> : null}
          {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

          <Field label="Warna penanda">
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
                      "flex size-7 items-center justify-center rounded-full transition-transform",
                      accent.solid,
                      selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-70",
                    )}
                  >
                    {selected ? <Check className="size-3.5 text-white" /> : null}
                  </button>
                );
              })}
            </div>
          </Field>

          <FieldGroup>
            <Field label="Nama program" htmlFor="program-name" error={state.fieldErrors?.name} required>
              <Input id="program-name" name="name" defaultValue={editing?.name ?? ""} placeholder="Matematika Intensif" required />
            </Field>
            <Field label="Mata pelajaran" htmlFor="program-subject" error={state.fieldErrors?.subject} required>
              <Input id="program-subject" name="subject" defaultValue={editing?.subject ?? ""} placeholder="Matematika" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tarif (Rp)" htmlFor="program-rate" error={state.fieldErrors?.rate} required>
                <Input
                  id="program-rate"
                  name="rate"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  defaultValue={editing?.rate ?? ""}
                  required
                />
              </Field>
              <Field label="Satuan tarif" error={state.fieldErrors?.rateUnit}>
                <Select name="rateUnit" defaultValue={editing?.rateUnit ?? "per_session"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RATE_UNIT_LABELS).map(([value, text]) => (
                      <SelectItem key={value} value={value}>
                        {text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Durasi (menit)" htmlFor="program-duration" error={state.fieldErrors?.defaultDurationMinutes}>
                <Input
                  id="program-duration"
                  name="defaultDurationMinutes"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  step={5}
                  defaultValue={editing?.defaultDurationMinutes ?? 60}
                />
              </Field>
              <Field label="Sesi per bulan" htmlFor="program-sessions" error={state.fieldErrors?.sessionsPerMonth}>
                <Input
                  id="program-sessions"
                  name="sessionsPerMonth"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  defaultValue={editing?.sessionsPerMonth ?? ""}
                  placeholder="Opsional"
                />
              </Field>
            </div>
            <Field label="Deskripsi" htmlFor="program-description" error={state.fieldErrors?.description}>
              <Textarea id="program-description" name="description" rows={2} defaultValue={editing?.description ?? ""} />
            </Field>
            <Field label="Status">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
                <input type="checkbox" name="isActive" value="on" defaultChecked={editing?.isActive ?? true} className="size-4" />
                <span className="text-sm">Program aktif</span>
              </label>
            </Field>
          </FieldGroup>

          <DialogFooter className="px-0 pb-0">
            {editing ? (
              <DeleteFormButton
                action={deleteProgramAction}
                hidden={{ programId: editing.id, studentId }}
                label="Hapus"
                onDone={() => setOpen(false)}
              />
            ) : null}
            <SubmitButton pendingLabel="Menyimpan…">{editing ? "Simpan" : "Tambah program"}</SubmitButton>
          </DialogFooter>
        </form>
      </SectionDialog>
    </Card>
  );
}

/* -------------------------------- Schedule -------------------------------- */

export function ScheduleSection({
  studentId,
  schedules,
  programs,
  periodStart,
  periodEnd,
}: {
  studentId: number;
  schedules: Schedule[];
  programs: ProgramOption[];
  periodStart: string | null;
  periodEnd: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [state, formAction] = useActionState(editing ? updateScheduleAction : createScheduleAction, idleState);
  useActionToast(state, () => setOpen(false));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">Jadwal rutin</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          disabled={programs.length === 0}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <CalendarPlus className="size-3.5" />
          Tambah
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {schedules.length === 0 ? (
          <EmptyRow>
            {programs.length === 0
              ? "Buat program les terlebih dahulu, lalu tambahkan jadwal rutinnya."
              : "Belum ada jadwal rutin. Pertemuan mendatang dibuat otomatis dari jadwal ini."}
          </EmptyRow>
        ) : (
          schedules.map((schedule) => (
            <RowButton
              key={schedule.id}
              onClick={() => {
                setEditing(schedule);
                setOpen(true);
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {DAY_NAMES_ID[schedule.dayOfWeek]} ·{" "}
                  {timeRangeLabel(schedule.startTime, addMinutesToTime(schedule.startTime, schedule.durationMinutes))}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>{FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency}</span>
                  {schedule.location ? (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />
                      {schedule.location}
                    </span>
                  ) : null}
                  <span>mulai {formatDateShort(schedule.startDate)}</span>
                  {schedule.isActive ? null : <span className="text-destructive">nonaktif</span>}
                </p>
              </div>
            </RowButton>
          ))
        )}
      </CardContent>

      <SectionDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Ubah jadwal" : "Jadwal rutin baru"}
        description="Pertemuan mendatang dibuat otomatis dari jadwal ini."
      >
        <form action={formAction} className="flex flex-col gap-4 pb-4">
          <input type="hidden" name="studentId" value={studentId} />
          {editing ? <input type="hidden" name="scheduleId" value={editing.id} /> : null}
          {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

          <FieldGroup>
            <Field label="Program" error={state.fieldErrors?.programId}>
              <Select
                name="programId"
                defaultValue={editing ? String(editing.programId) : programs[0] ? String(programs[0].id) : undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih program" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Hari" error={state.fieldErrors?.dayOfWeek}>
                <Select name="dayOfWeek" defaultValue={String(editing?.dayOfWeek ?? 1)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES_ID.map((day, index) => (
                      <SelectItem key={day} value={String(index)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Jam mulai" htmlFor="schedule-start" error={state.fieldErrors?.startTime} required>
                <Input
                  id="schedule-start"
                  name="startTime"
                  type="time"
                  defaultValue={editing ? editing.startTime.slice(0, 5) : "15:00"}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Durasi (menit)" htmlFor="schedule-duration" error={state.fieldErrors?.durationMinutes}>
                <Input
                  id="schedule-duration"
                  name="durationMinutes"
                  type="number"
                  inputMode="numeric"
                  min={5}
                  step={5}
                  defaultValue={editing?.durationMinutes ?? 60}
                />
              </Field>
              <Field label="Frekuensi" error={state.fieldErrors?.frequency}>
                <Select name="frequency" defaultValue={editing?.frequency ?? "weekly"}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FREQUENCY_LABELS).map(([value, text]) => (
                      <SelectItem key={value} value={value}>
                        {text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Mulai tanggal" htmlFor="schedule-start-date" error={state.fieldErrors?.startDate} required>
                <Input
                  id="schedule-start-date"
                  name="startDate"
                  type="date"
                  defaultValue={editing?.startDate ?? periodStart ?? todayKey()}
                  required
                />
              </Field>
              <Field label="Selesai (opsional)" htmlFor="schedule-end-date" error={state.fieldErrors?.endDate}>
                <Input id="schedule-end-date" name="endDate" type="date" defaultValue={editing?.endDate ?? periodEnd ?? ""} />
              </Field>
            </div>

            <Field label="Lokasi" htmlFor="schedule-location" error={state.fieldErrors?.location}>
              <Input id="schedule-location" name="location" defaultValue={editing?.location ?? ""} placeholder="Rumah murid" />
            </Field>
            <Field label="Catatan" htmlFor="schedule-notes" error={state.fieldErrors?.notes}>
              <Textarea id="schedule-notes" name="notes" rows={2} defaultValue={editing?.notes ?? ""} />
            </Field>
            <Field label="Status">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5">
                <input type="checkbox" name="isActive" value="on" defaultChecked={editing?.isActive ?? true} className="size-4" />
                <span className="text-sm">Jadwal aktif — pertemuan baru dibuat otomatis</span>
              </label>
            </Field>
          </FieldGroup>

          <DialogFooter className="px-0 pb-0">
            {editing ? (
              <DeleteFormButton
                action={deleteScheduleAction}
                hidden={{ scheduleId: editing.id, studentId }}
                label="Hapus"
                onDone={() => setOpen(false)}
              />
            ) : null}
            <SubmitButton pendingLabel="Menyimpan…">{editing ? "Simpan" : "Tambah jadwal"}</SubmitButton>
          </DialogFooter>
        </form>
      </SectionDialog>
    </Card>
  );
}

