import { CalendarCheck, CalendarDays, Clock, Wallet } from "lucide-react";
import { FcCalendar } from "react-icons/fc";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonRow } from "@/components/lesson/lesson-row";
import { PracticeGenerator } from "@/components/student/practice-generator";
import { StudentAvatar } from "@/components/student-avatar";
import { ParentAccessSection } from "@/components/student/parent-access-section";
import { ProgramSection, ScheduleSection } from "@/components/student/student-detail-sections";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { requireTutor } from "@/lib/auth";
import { formatCurrency, formatDateLong, formatDuration, relativeDayLabel, timeRangeLabel } from "@/lib/datetime";
import { ASSIGNMENT_STATUS_LABELS, labelOf } from "@/lib/domain/labels";
import { assignmentsForTutor, weakMaterialsForStudent } from "@/lib/services/assignments";
import { listPendingInvites } from "@/lib/services/parents";
import { lessonsForStudent } from "@/lib/services/sessions";
import { studentStats } from "@/lib/services/stats";
import {
  StudentError,
  parentsForStudents,
  programsForStudent,
  schedulesForTutor,
  studentSummary,
} from "@/lib/services/students";
import type { TodayLesson } from "@/lib/services/stats";

function assignmentStatusVariant(status: string) {
  if (status === "published") return "success" as const;
  if (status === "archived") return "secondary" as const;
  return "outline" as const;
}

export default async function StudentDetailPage(props: PageProps<"/students/[id]">) {
  const user = await requireTutor();
  const { id } = await props.params;
  const studentId = Number(id);

  let summary;
  try {
    summary = await studentSummary(user.id, studentId);
  } catch (error) {
    if (error instanceof StudentError) notFound();
    throw error;
  }

  const student = summary.student;
  const [programs, schedules, parents, invites, recentLessons, stats, weakMaterials, recentAssignments] =
    await Promise.all([
      programsForStudent(studentId),
      schedulesForTutor(user.id, { studentId, includeInactive: true }),
      parentsForStudents([studentId]),
      listPendingInvites(user.id, studentId),
      lessonsForStudent(studentId, 12),
      studentStats(studentId, student.periodStart),
      weakMaterialsForStudent(user.id, studentId, 3),
      assignmentsForTutor(user.id, { studentId, limit: 5, orderBy: "updatedAt" }),
    ]);

  const programNames = new Map(programs.map((program) => [program.id, program.name]));
  const lessonEntries: TodayLesson[] = recentLessons.map((lesson) => ({
    lesson,
    studentName: student.name,
    studentNickname: student.nickname,
    studentColor: student.color,
    programName: programNames.get(lesson.programId) ?? "Program",
    reportStatus: lesson.reportStatus,
  }));

  const meta = [
    student.school,
    student.grade ? `Kelas ${student.grade}` : null,
    student.birthDate ? `Lahir ${formatDateLong(student.birthDate)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={student.name}
        description={student.nickname ?? undefined}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/students/${student.id}/edit`}>Ubah</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="flex items-start gap-3 pt-4">
          <StudentAvatar name={student.name} color={student.color} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold">{student.name}</p>
              {student.isActive ? (
                <Badge variant="success" className="shrink-0 text-[10px]">
                  Aktif
                </Badge>
              ) : (
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  Nonaktif
                </Badge>
              )}
            </div>
            {meta ? <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p> : null}
            {summary.nextLesson ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Pertemuan berikutnya {relativeDayLabel(summary.nextLesson.date)} ·{" "}
                {timeRangeLabel(summary.nextLesson.startTime, summary.nextLesson.endTime)}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">Belum ada pertemuan terjadwal.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          label="Pertemuan selesai"
          value={stats.completedLessons}
          hint={`${stats.lessonsThisPeriod} periode ini`}
          icon={CalendarCheck}
          tone="primary"
        />
        <StatCard
          label="Kehadiran"
          value={stats.attendanceRate === null ? "—" : `${stats.attendanceRate}%`}
          hint={stats.cancelledLessons > 0 ? `${stats.cancelledLessons} batal` : "Tidak ada pembatalan"}
          icon={CalendarDays}
          tone="default"
        />
        <StatCard label="Total jam les" value={formatDuration(stats.totalMinutes)} hint="Dari pertemuan hadir" icon={Clock} tone="default" />
        <StatCard
          label="Piutang"
          value={formatCurrency(stats.outstandingTotal)}
          hint={stats.outstandingTotal > 0 ? "Belum lunas" : "Tidak ada tagihan terbuka"}
          icon={Wallet}
          tone={stats.outstandingTotal > 0 ? "destructive" : "success"}
        />
      </div>

      {weakMaterials.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Materi yang masih kurang</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1.5">
              {weakMaterials.map((row) => (
                <li key={row.material} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-foreground">{row.material}</span>
                  <span className="shrink-0 text-muted-foreground">
                    salah {row.wrongCount} dari {row.answeredCount} soal
                  </span>
                </li>
              ))}
            </ul>
            <PracticeGenerator studentId={student.id} />
          </CardContent>
        </Card>
      ) : null}

      {recentAssignments.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Riwayat Tugas</h2>
            <Link href={`/assignments?student=${student.id}`} className="text-xs font-medium text-primary">
              Semua
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentAssignments.map((item) => (
              <Link
                key={item.assignment.id}
                href={`/assignments/${item.assignment.id}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-xs transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{item.assignment.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge variant={assignmentStatusVariant(item.assignment.status)} className="text-[9px]">
                      {labelOf(ASSIGNMENT_STATUS_LABELS, item.assignment.status)}
                    </Badge>
                    <span className="text-muted-foreground">
                      {item.questionCount} soal
                      {item.bestScore !== null ? ` · terbaik ${item.bestScore}` : ""}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <ProgramSection studentId={student.id} programs={programs} schedules={schedules} />
      <ScheduleSection
        studentId={student.id}
        schedules={schedules}
        programs={programs}
        periodStart={student.periodStart}
        periodEnd={student.periodEnd}
      />

      <ParentAccessSection
        studentId={student.id}
        studentName={student.name}
        parents={parents}
        invites={invites.map((invite) => ({
          id: invite.id,
          path: `/invite/${invite.token}`,
          email: invite.email,
          name: invite.name,
          phone: invite.phone,
          expiresAt: invite.expiresAt.toISOString(),
        }))}
        defaultName={student.parentName ?? ""}
        defaultEmail={student.parentEmail ?? ""}
        defaultPhone={student.parentPhone ?? ""}
      />

      <section className="flex flex-col gap-2.5">
        <h2 className="text-sm font-bold">Riwayat pertemuan</h2>

        {lessonEntries.length === 0 ? (
          <EmptyState
            icon={FcCalendar}
            title="Belum ada pertemuan"
            description="Tambahkan jadwal rutin supaya pertemuan mendatang dibuat otomatis."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {lessonEntries.map((entry) => (
              <LessonRow key={entry.lesson.id} entry={entry} showDate />
            ))}
          </div>
        )}
      </section>

      {student.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Catatan pribadi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs whitespace-pre-wrap text-muted-foreground">{student.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
