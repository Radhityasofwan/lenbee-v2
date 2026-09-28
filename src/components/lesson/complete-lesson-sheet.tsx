"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetTrigger } from "@/components/ui/sheet";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert } from "@/components/ui/form-alert";
import { completeLessonAction, saveLessonReportAction } from "@/app/actions/lessons";
import { idleState } from "@/lib/form";
import { useActionToast } from "@/lib/hooks/use-action-toast";
import { FOCUS_LABELS } from "@/lib/domain/labels";
import { formatDateLong, timeRangeLabel } from "@/lib/datetime";

const QUICK_MINUTES = [30, 45, 60, 90, 120];

export type CompletableLesson = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string;
  focus: string;
  topicLabel: string | null;
  material: string | null;
  activities: string | null;
  notes: string | null;
  reportText: string | null;
  isBillable: boolean;
  attendance: string | null;
  studentName: string;
  studentNickname: string | null;
  studentColor: string;
  programName: string;
  programSubject: string | null;
};

export function CompleteLessonSheet({
  lesson,
  label = "Selesai Mengajar",
  variant = "default",
  size = "sm",
  className,
}: {
  lesson: CompletableLesson;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "sm" | "default";
  className?: string;
}) {
  const done = lesson.status === "completed";
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(done ? saveLessonReportAction : completeLessonAction, idleState);
  const [duration, setDuration] = useState(lesson.durationMinutes);
  const [report, setReport] = useState(lesson.reportText ?? "");
  const [generating, setGenerating] = useState(false);
  const [attendance, setAttendance] = useState(lesson.attendance === "absent" ? "absent" : "present");
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};
  const name = lesson.studentNickname || lesson.studentName;

  useActionToast(state, () => setOpen(false));

  async function handleGenerate() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setGenerating(true);
    try {
      const response = await fetch("/api/ai/lesson-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: String(lesson.id),
          tone: "ramah",
          focus: data.get("focus"),
          topicLabel: data.get("topicLabel"),
          material: data.get("material"),
          activities: data.get("activities"),
          notes: data.get("notes"),
        }),
      });
      const payload = (await response.json()) as { text?: string; usedAi?: boolean; error?: string };
      if (!response.ok || !payload.text) {
        toast.error(payload.error ?? "Gagal membuat report.");
        return;
      }
      setReport(payload.text);
      toast.success(payload.usedAi ? "Report dibuat dengan AI." : "Report dibuat dari ringkasan Anda (AI belum dikonfigurasi).");
    } catch {
      toast.error("Gagal menghubungi layanan AI.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {done ? <Check /> : null}
          {done ? "Lihat / Ubah Laporan" : label}
        </Button>
      </SheetTrigger>

      <SheetContent
        title={done ? "Laporan Pertemuan" : label}
        description={`${name} · ${lesson.programName} · ${formatDateLong(lesson.date)} · ${timeRangeLabel(lesson.startTime, lesson.endTime)}`}
      >
        <form ref={formRef} action={formAction}>
          <input type="hidden" name="lessonId" value={lesson.id} />
          {done ? <input type="hidden" name="reportStatus" value="final" /> : null}

          <div className="flex flex-col gap-5">
            {state.message && !state.ok ? <FormAlert tone="error">{state.message}</FormAlert> : null}

            {done ? null : (
              <>
              <Field label="Kehadiran" required error={errors.attendance}>
                <RadioGroup
                  name="attendance"
                  value={attendance}
                  onValueChange={setAttendance}
                  className="grid grid-cols-2 gap-2"
                >
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/8">
                    <RadioGroupItem value="present" />
                    Hadir
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/8">
                    <RadioGroupItem value="absent" />
                    Tidak hadir
                  </label>
                </RadioGroup>
              </Field>

              {attendance === "absent" ? (
                <input type="hidden" name="durationMinutes" value={duration} />
              ) : (
                <Field
                  label="Durasi (menit)"
                  htmlFor="durationMinutes"
                  error={errors.durationMinutes}
                  hint="Ubah jika sesi lebih cepat atau lebih lama dari jadwal."
                >
                  <Input
                    id="durationMinutes"
                    name="durationMinutes"
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={600}
                    step={5}
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                    required
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_MINUTES.map((minute) => (
                      <Button
                        key={minute}
                        type="button"
                        size="sm"
                        variant={duration === minute ? "default" : "outline"}
                        className="h-7 px-2.5 text-xs"
                        onClick={() => setDuration(minute)}
                      >
                        {minute}m
                      </Button>
                    ))}
                  </div>
                </Field>
              )}
              </>
            )}

            {done || attendance === "present" ? (
              <>
              <Field label="Fokus pertemuan" error={errors.focus}>
                <Select name="focus" defaultValue={lesson.focus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih fokus" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FOCUS_LABELS).map(([value, text]) => (
                      <SelectItem key={value} value={value}>
                        {text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Materi / topik" htmlFor="topicLabel" error={errors.topicLabel} hint="Contoh: Persamaan linear dua variabel.">
                <Input id="topicLabel" name="topicLabel" defaultValue={lesson.topicLabel ?? ""} maxLength={160} />
              </Field>

              <FieldGroup>
                <Field label="Materi yang dibahas" htmlFor="material" error={errors.material}>
                  <Textarea id="material" name="material" rows={3} defaultValue={lesson.material ?? ""} placeholder="Apa yang dipelajari hari ini…" />
                </Field>

                <Field label="Kegiatan belajar" htmlFor="activities" error={errors.activities}>
                  <Textarea id="activities" name="activities" rows={3} defaultValue={lesson.activities ?? ""} placeholder="Latihan, diskusi, kuis, dsb." />
                </Field>

                <Field label="Catatan internal" htmlFor="notes" error={errors.notes} hint="Tidak ditampilkan ke orang tua.">
                  <Textarea id="notes" name="notes" rows={2} defaultValue={lesson.notes ?? ""} />
                </Field>
              </FieldGroup>
              </>
            ) : null}

              <Field
                label={done || attendance === "present" ? "Laporan untuk orang tua" : "Alasan tidak hadir"}
                htmlFor="reportText"
                error={errors.reportText}
                required={!done && attendance === "absent"}
                hint={
                  done || attendance === "present"
                    ? "Laporan ini yang dibaca orang tua dan masuk ke riwayat murid."
                    : "Alasan ini yang dibaca orang tua, menggantikan laporan materi."
                }
              >
                <Textarea
                  id="reportText"
                  name="reportText"
                  rows={done || attendance === "present" ? 6 : 3}
                  value={report}
                  onChange={(event) => setReport(event.target.value)}
                  required={!done && attendance === "absent"}
                  placeholder={
                    done || attendance === "present"
                      ? "Tulis laporan, atau minta AI menyusunnya dari poin-poin di atas…"
                      : "Contoh: Anak sedang sakit, sudah dikonfirmasi orang tua…"
                  }
                />
                {done || attendance === "present" ? (
                  <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleGenerate} disabled={generating}>
                    {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    {generating ? "Menyusun…" : "Susun dengan AI"}
                  </Button>
                ) : null}
              </Field>

            {done || attendance === "absent" ? null : (
              <Field label="Tagihan" error={errors.isBillable}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5">
                  <Checkbox name="isBillable" value="on" defaultChecked={lesson.isBillable} className="mt-0.5" />
                  <span className="text-sm leading-snug">
                    Hitung pertemuan ini ke tagihan
                    <span className="block text-xs text-muted-foreground">
                      Hilangkan centang untuk sesi gratis atau sesi yang tidak ditagih.
                    </span>
                  </span>
                </label>
              </Field>
            )}
          </div>

          <SheetFooter>
            <SubmitButton pendingLabel="Menyimpan…" className="w-full">
              Simpan &amp; sebarkan
            </SubmitButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
