import { ChevronLeft, ChevronRight } from "lucide-react";
import { FcCalendar } from "react-icons/fc";
import Link from "next/link";
import { ExtraSessionDialog } from "@/components/lesson/extra-session-dialog";
import { LessonRow } from "@/components/lesson/lesson-row";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { DATE_KEY } from "@/lib/validation";
import {
  DAY_SHORT_ID,
  addDays,
  formatDateShort,
  formatMonthYear,
  parseDateKey,
  startOfWeek,
  todayKey,
} from "@/lib/datetime";
import { ensureSessionsAround, lessonsBetween } from "@/lib/services/sessions";
import type { TodayLesson } from "@/lib/services/stats";
import { activeProgramsForTutor, listStudents } from "@/lib/services/students";
import { cn } from "@/lib/utils";

export default async function SchedulePage(props: PageProps<"/schedule">) {
  const user = await requireTutor();
  const params = await props.searchParams;
  const raw = typeof params.date === "string" ? params.date : undefined;
  const selectedDate = raw && DATE_KEY.test(raw) ? raw : todayKey();

  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = weekDays[6];
  const today = todayKey();

  await ensureSessionsAround(user.id, 60);

  const [lessons, students, programs] = await Promise.all([
    lessonsBetween(user.id, weekStart, weekEnd),
    listStudents(user.id),
    activeProgramsForTutor(user.id),
  ]);

  const studentsById = new Map(students.map((student) => [student.id, student]));
  const programsById = new Map(programs.map((program) => [program.id, program]));

  const byDate = new Map<string, TodayLesson[]>();
  for (const lesson of lessons) {
    // Baris `moved` hanya penanda jadwal lama; yang perlu tampil adalah jadwal penggantinya
    // (lihat pola yang sama di parent/schedule/page.tsx), supaya tidak terlihat duplikat
    // saat pertemuan dipindah lalu dipindah balik ke tanggal semula.
    if (lesson.status === "moved") continue;
    const student = studentsById.get(lesson.studentId);
    const entry: TodayLesson = {
      lesson,
      studentName: student?.name ?? "Murid",
      studentNickname: student?.nickname ?? null,
      studentColor: student?.color ?? "violet",
      programName: programsById.get(lesson.programId)?.name ?? "Program",
      reportStatus: lesson.reportStatus,
    };
    const list = byDate.get(lesson.date);
    if (list) list.push(entry);
    else byDate.set(lesson.date, [entry]);
  }

  const dayEntries = byDate.get(selectedDate) ?? [];
  const activeCount = dayEntries.filter((entry) => entry.lesson.status !== "cancelled").length;

  const shift = (days: number) => `/schedule?date=${addDays(selectedDate, days)}`;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Jadwal"
        description="Semua pertemuan yang sudah terbentuk dari jadwal rutin."
        action={
          <ExtraSessionDialog
            students={students.map((student) => ({
              id: student.id,
              name: student.name,
              nickname: student.nickname,
            }))}
            programs={programs.map((program) => ({
              id: program.id,
              name: program.name,
              studentId: program.studentId,
              defaultDurationMinutes: program.defaultDurationMinutes,
            }))}
            defaultDate={selectedDate}
          />
        }
      />

      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="icon" className="size-9 shrink-0" aria-label="Minggu sebelumnya">
          <Link href={shift(-7)}>
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 text-center">
          <p className="text-sm font-bold">{formatMonthYear(weekStart)}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}
          </p>
        </div>
        <Button asChild variant="ghost" size="icon" className="size-9 shrink-0" aria-label="Minggu berikutnya">
          <Link href={shift(7)}>
            <ChevronRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((date) => {
          const entries = byDate.get(date) ?? [];
          const selected = date === selectedDate;
          const isToday = date === today;
          return (
            <Link
              key={date}
              href={`/schedule?date=${date}`}
              aria-current={selected ? "date" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border py-2 transition-colors",
                selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-medium",
                  selected ? "text-primary" : isToday ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {DAY_SHORT_ID[parseDateKey(date).getDay()]}
              </span>
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                  isToday && !selected && "bg-muted",
                  selected ? "text-primary" : "text-foreground",
                )}
              >
                {parseDateKey(date).getDate()}
              </span>
              <span
                className={cn(
                  "size-1 rounded-full",
                  entries.length === 0 ? "bg-transparent" : selected ? "bg-primary" : "bg-muted-foreground/50",
                )}
              />
            </Link>
          );
        })}
      </div>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">{formatDateShort(selectedDate)}</h2>
          <span className="text-xs text-muted-foreground">
            {activeCount === 0 ? "Kosong" : `${activeCount} pertemuan`}
          </span>
        </div>

        {dayEntries.length === 0 ? (
          <EmptyState
            icon={FcCalendar}
            title="Tidak ada pertemuan"
            description="Tambahkan jadwal rutin di halaman murid, atau buat sesi tambahan untuk hari ini."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {dayEntries.map((entry) => (
              <LessonRow key={entry.lesson.id} entry={entry} showLocation />
            ))}
          </div>
        )}
      </section>

      {dayEntries.length > 0 ? (
        <p className="pb-1 text-center text-xs text-muted-foreground">
          Ketuk “Selesai Mengajar” pada baris pertemuan untuk mengisi materi dan catatan.
        </p>
      ) : null}
    </div>
  );
}
