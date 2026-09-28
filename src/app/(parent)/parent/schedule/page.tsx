import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { FcBarChart, FcCalendar } from "react-icons/fc";
import { ChildrenFilter } from "../../children-filter";
import { TopPanel } from "@/components/top-panel";
import { LessonItem, type ScheduleEntry } from "./lesson-item";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireParent } from "@/lib/auth";
import { accessibleStudentIds, getStudentForUser } from "@/lib/authz";
import { accentOf } from "@/lib/domain/colors";
import {
  DAY_NAMES_ID,
  MONTH_NAMES_ID,
  addDays,
  addMonths,
  diffDays,
  endOfMonth,
  formatDateLong,
  formatDateShort,
  formatMonthYear,
  parseDateKey,
  relativeDayLabel,
  startOfMonth,
  timeRangeLabel,
  todayKey,
} from "@/lib/datetime";
import { lessonsForStudentsBetween } from "@/lib/services/sessions";
import { programsForStudent } from "@/lib/services/students";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Jadwal" };

const FUTURE_DAYS = 28;
const HISTORY_DAYS = 30;
const HISTORY_LIMIT = 8;
const PERIOD_MONTHS_BACK = 3;
const PERIOD_MONTHS_FORWARD = 3;

/** "Hari ini" / "Besok" untuk hari terdekat, nama hari untuk sisanya. */
function dayHeading(date: string, today: string) {
  const delta = diffDays(date, today);
  if (delta <= 1) return relativeDayLabel(date, today);
  return DAY_NAMES_ID[parseDateKey(date).getDay()];
}

function monthShort(month: string) {
  return MONTH_NAMES_ID[Number(month.slice(5, 7)) - 1]?.slice(0, 3) ?? month;
}

type MonthBucket = {
  total: number;
  completed: number;
  scheduled: number;
  cancelled: number;
  entries: ScheduleEntry[];
};

export default async function ParentSchedulePage({ searchParams }: PageProps<"/parent/schedule">) {
  const parent = await requireParent();
  const params = await searchParams;
  const requested = Number(params?.student);
  const selected = Number.isInteger(requested) && requested > 0 ? requested : null;
  const monthParam = typeof params?.month === "string" && /^\d{4}-\d{2}$/.test(params.month) ? params.month : null;

  const ids = await accessibleStudentIds(parent);
  const visible = selected && ids.includes(selected) ? [selected] : ids;

  if (visible.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Jadwal" description="Jadwal les anak Anda." />
        <EmptyState
          icon={FcCalendar}
          title="Belum ada anak yang terhubung"
          description="Minta pengajar mengirim ulang tautan undangan agar akun Anda terhubung dengan data anak."
        />
      </div>
    );
  }

  const today = todayKey();
  const currentMonth = today.slice(0, 7);
  const [lessons, studentRows, programRows] = await Promise.all([
    lessonsForStudentsBetween(
      visible,
      startOfMonth(addMonths(today, -PERIOD_MONTHS_BACK)),
      endOfMonth(addMonths(today, PERIOD_MONTHS_FORWARD)),
    ),
    Promise.all(visible.map((id) => getStudentForUser(parent, id))),
    Promise.all(visible.map((id) => programsForStudent(id))),
  ]);

  const students = studentRows.filter((student): student is NonNullable<typeof student> => student !== null);
  const options = students.map((student) => ({
    studentId: student.id,
    name: student.name,
    nickname: student.nickname,
  }));
  const studentById = new Map(students.map((student) => [student.id, student]));
  const programs = programRows.flat();
  const programNames = new Map(programs.map((program) => [program.id, program.name]));

  const entries: ScheduleEntry[] = lessons.map((lesson) => ({
    lesson,
    studentName: studentById.get(lesson.studentId)?.name ?? "Anak Anda",
    studentColor: studentById.get(lesson.studentId)?.color ?? null,
    programName: programNames.get(lesson.programId) ?? "Program les",
  }));

  // Baris `moved` hanya penanda: yang perlu dilihat orang tua adalah jadwal penggantinya.
  const active = entries.filter((entry) => entry.lesson.status !== "moved");
  const upcoming = active.filter((entry) => entry.lesson.date >= today && entry.lesson.date <= addDays(today, FUTURE_DAYS));
  const history = active
    .filter((entry) => entry.lesson.date < today && entry.lesson.date >= addDays(today, -HISTORY_DAYS))
    .slice(-HISTORY_LIMIT)
    .reverse();

  // Rekap per bulan. Batal dihitung terpisah; "total pertemuan" = yang benar-benar berjalan.
  const buckets = new Map<string, MonthBucket>();
  for (const entry of active) {
    const month = entry.lesson.date.slice(0, 7);
    let bucket = buckets.get(month);
    if (!bucket) {
      bucket = { total: 0, completed: 0, scheduled: 0, cancelled: 0, entries: [] };
      buckets.set(month, bucket);
    }
    bucket.entries.push(entry);
    if (entry.lesson.status === "cancelled") {
      bucket.cancelled += 1;
    } else {
      bucket.total += 1;
      if (entry.lesson.status === "completed") bucket.completed += 1;
      else bucket.scheduled += 1;
    }
  }

  const monthChips = [...new Set([...buckets.keys(), currentMonth])].sort();
  const selectedMonth = monthParam && monthChips.includes(monthParam) ? monthParam : null;
  const summaryMonth = selectedMonth ?? currentMonth;
  const summary = buckets.get(summaryMonth) ?? null;
  const selectedBucket = selectedMonth ? buckets.get(summaryMonth) ?? null : null;

  // Target pertemuan per bulan ditentukan pengajar pada tiap program aktif.
  const monthlyTarget = programs.reduce(
    (sum, program) => sum + (program.isActive ? (program.sessionsPerMonth ?? 0) : 0),
    0,
  );

  const next = upcoming[0] ?? null;
  const showChild = visible.length > 1;

  const monthHref = (month: string | null) => {
    const query = new URLSearchParams();
    if (selected) query.set("student", String(selected));
    if (month) query.set("month", month);
    const qs = query.toString();
    return `/parent/schedule${qs ? `?${qs}` : ""}`;
  };

  const chip = (href: string, isActive: boolean, content: ReactNode) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        isActive ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {content}
    </Link>
  );

  const monthDays = selectedBucket
    ? [...new Set(selectedBucket.entries.map((entry) => entry.lesson.date))].sort()
    : [];

  // Laporan pertemuan hanya ada pada pertemuan yang sudah selesai.
  const reportHref = (entry: ScheduleEntry) =>
    entry.lesson.status === "completed" ? `/parent/schedule/${entry.lesson.id}` : undefined;

  return (
    <div className="flex flex-col gap-5">
      <TopPanel>
        <PageHeader
          title="Jadwal"
          description={
            showChild
              ? `Jadwal les ${visible.length} anak Anda.`
              : `Jadwal les ${students[0]?.nickname ?? students[0]?.name ?? "anak Anda"}.`
          }
        />

        <div className="mt-3 flex items-center gap-2">
          <FcBarChart className="size-3.5" />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Rekap pertemuan</p>
        </div>

        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
          {chip(
            monthHref(null),
            selectedMonth === null,
            <span>Ringkasan</span>,
          )}
          {monthChips.map((month) =>
            chip(
              monthHref(month),
              selectedMonth === month,
              <>
                {monthShort(month)}
                <span className={cn("ml-1.5 font-semibold", selectedMonth === month ? "" : "text-foreground")}>
                  {buckets.get(month)?.total ?? 0}
                </span>
              </>,
            ),
          )}
        </div>

        {summary ? (
          <div className="mt-2 flex flex-col gap-0.5">
            <p className="text-sm">
              <span className="font-semibold">{formatMonthYear(`${summaryMonth}-01`)}</span> ·{" "}
              <span className="font-semibold">{summary.total}</span> pertemuan
              {summary.cancelled > 0 ? (
                <span className="text-muted-foreground"> · {summary.cancelled} batal</span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {summary.completed} selesai · {summary.scheduled} terjadwal
            </p>
            {monthlyTarget > 0 ? (
              <>
                <ProgressBar value={summary.total} max={monthlyTarget} toneClassName="bg-primary" className="mt-1" />
                <p className="text-xs text-muted-foreground">Target pengajar: {monthlyTarget} pertemuan per bulan.</p>
              </>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Belum ada pertemuan pada {formatMonthYear(`${summaryMonth}-01`)}.
          </p>
        )}
      </TopPanel>

      <ChildrenFilter basePath="/parent/schedule" options={options} selected={selected} />

      {selectedBucket ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold">
            Pertemuan {formatMonthYear(`${selectedMonth}-01`)}
          </h2>

          {monthDays.length === 0 ? (
            <EmptyState
              icon={FcCalendar}
              title="Tidak ada pertemuan pada periode ini"
              description="Pilih periode lain pada rekap di atas untuk melihat jumlah pertemuan."
            />
          ) : (
            monthDays.map((date) => (
              <div key={date} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2 px-1">
                  <h3 className="text-sm font-bold">{dayHeading(date, today)}</h3>
                  <span className="text-xs text-muted-foreground">{formatDateLong(date)}</span>
                </div>
                <Card>
                  <CardContent className="flex flex-col gap-0.5 p-1.5">
                    {selectedBucket.entries
                      .filter((entry) => entry.lesson.date === date)
                      .map((entry) => (
                        <LessonItem
                          key={entry.lesson.id}
                          entry={entry}
                          showChild={showChild}
                          href={reportHref(entry)}
                        />
                      ))}
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </section>
      ) : (
        <>
          {next
            ? (() => {
                const accent = accentOf(next.studentColor);
                const daysAway = diffDays(next.lesson.date, today);
                return (
                  <div className={cn("flex items-start gap-3 rounded-2xl bg-gradient-to-br p-4", accent.gradient)}>
                    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", accent.soft, accent.text)}>
                      <FcCalendar className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Jadwal berikutnya</p>
                        {daysAway > 1 ? (
                          <span className={cn("ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", accent.soft, accent.text)}>
                            {daysAway} hari lagi
                          </span>
                        ) : null}
                      </div>
                      <p className="text-base font-bold">
                        {relativeDayLabel(next.lesson.date)} · {timeRangeLabel(next.lesson.startTime, next.lesson.endTime)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {showChild ? `${next.studentName} · ` : ""}
                        {next.programName} · {formatDateLong(next.lesson.date)}
                      </p>
                    </div>
                  </div>
                );
              })()
            : null}

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold">Jadwal mendatang</h2>

            {upcoming.length === 0 ? (
              <EmptyState
                icon={FcCalendar}
                title="Belum ada jadwal mendatang"
                description="Jadwal muncul otomatis setelah pengajar mengatur jadwal rutin les. Hubungi pengajar bila jadwal belum tampil."
              />
            ) : (
              [...new Set(upcoming.map((entry) => entry.lesson.date))].map((date) => (
                <div key={date} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2 px-1">
                    <h3 className="text-sm font-bold">{dayHeading(date, today)}</h3>
                    <span className="text-xs text-muted-foreground">{formatDateShort(date)}</span>
                  </div>
                  <Card>
                    <CardContent className="flex flex-col gap-0.5 p-1.5">
                      {upcoming
                        .filter((entry) => entry.lesson.date === date)
                        .map((entry) => (
                          <LessonItem
                            key={entry.lesson.id}
                            entry={entry}
                            showChild={showChild}
                            href={reportHref(entry)}
                          />
                        ))}
                    </CardContent>
                  </Card>
                </div>
              ))
            )}
          </section>

          {history.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold">Pertemuan terakhir</h2>
              <Card>
                <CardContent className="flex flex-col gap-0.5 p-1.5">
                  {history.map((entry) => (
                    <div key={entry.lesson.id} className="flex flex-col">
                      <span className="px-2.5 pt-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {formatDateShort(entry.lesson.date)}
                      </span>
                      <LessonItem entry={entry} showChild={showChild} href={reportHref(entry)} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>
          ) : null}
        </>
      )}

      <p className="px-1 text-center text-[11px] text-muted-foreground">
        Jadwal bisa berubah. Bila pengajar memindahkan pertemuan, jadwal baru langsung tampil di halaman ini.
      </p>
    </div>
  );
}
