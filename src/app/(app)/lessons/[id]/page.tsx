import { Paperclip, Sparkles } from "lucide-react";
import { FcCalendar, FcClock, FcDocument, FcGraduationCap, FcMoneyTransfer } from "react-icons/fc";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompleteLessonSheet, type CompletableLesson } from "@/components/lesson/complete-lesson-sheet";
import { LessonActions } from "@/components/lesson/lesson-actions";
import { LessonAttachmentSection } from "@/components/lesson/lesson-attachments";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import {
  formatDateLong,
  formatDuration,
  timeRangeLabel,
} from "@/lib/datetime";
import {
  ATTENDANCE_LABELS,
  FOCUS_LABELS,
  REPORT_STATUS_LABELS,
  STATUS_LABELS,
  labelOf,
} from "@/lib/domain/labels";
import { attachmentsForLesson } from "@/lib/services/attachments";
import { LessonError, getOwnedLesson } from "@/lib/services/sessions";
import { StudentError, getOwnedProgram, getOwnedStudent } from "@/lib/services/students";

const STATUS_TONE: Record<string, "default" | "success" | "destructive" | "secondary"> = {
  scheduled: "secondary",
  completed: "success",
  cancelled: "destructive",
  moved: "default",
};

export default async function LessonDetailPage(props: PageProps<"/lessons/[id]">) {
  const user = await requireTutor();
  const { id } = await props.params;
  const lessonId = Number(id);
  if (!Number.isInteger(lessonId) || lessonId <= 0) notFound();

  const lesson = await getOwnedLesson(user.id, lessonId).catch((error: unknown) => {
    if (error instanceof LessonError) return null;
    throw error;
  });
  if (!lesson) notFound();

  const [student, program, attachments] = await Promise.all([
    getOwnedStudent(user.id, lesson.studentId).catch((error: unknown) => {
      if (error instanceof StudentError) return null;
      throw error;
    }),
    getOwnedProgram(user.id, lesson.programId).catch((error: unknown) => {
      if (error instanceof StudentError) return null;
      throw error;
    }),
    attachmentsForLesson(lesson.id),
  ]);
  if (!student || !program) notFound();

  const name = student.nickname || student.name;
  const completable: CompletableLesson = {
    id: lesson.id,
    date: lesson.date,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    durationMinutes: lesson.durationMinutes,
    status: lesson.status,
    focus: lesson.focus,
    topicLabel: lesson.topicLabel,
    material: lesson.material,
    activities: lesson.activities,
    notes: lesson.notes,
    reportText: lesson.reportText,
    isBillable: lesson.isBillable,
    attendance: lesson.attendance,
    studentName: student.name,
    studentNickname: student.nickname,
    studentColor: student.color,
    programName: program.name,
    programSubject: program.subject,
  };

  const facts = [
    { icon: FcCalendar, label: formatDateLong(lesson.date) },
    { icon: FcClock, label: `${timeRangeLabel(lesson.startTime, lesson.endTime)} · ${formatDuration(lesson.durationMinutes)}` },
    { icon: FcGraduationCap, label: [program.name, program.subject].filter(Boolean).join(" · ") },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={name}
        description={`${formatDateLong(lesson.date)} · ${timeRangeLabel(lesson.startTime, lesson.endTime)}`}
        action={
          lesson.status === "cancelled" || lesson.status === "moved" ? undefined : (
            <CompleteLessonSheet lesson={completable} />
          )
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-center gap-3">
            <StudentAvatar name={student.name} color={student.color} />
            <div className="min-w-0 flex-1">
              <Link href={`/students/${student.id}`} className="truncate text-sm font-bold hover:underline">
                {student.name}
              </Link>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant={STATUS_TONE[lesson.status] ?? "default"} className="text-[10px]">
                  {labelOf(STATUS_LABELS, lesson.status)}
                </Badge>
                {lesson.status === "completed" ? (
                  <Badge variant="outline" className="text-[10px]">
                    {labelOf(ATTENDANCE_LABELS, lesson.attendance)}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="text-[10px]">
                  {labelOf(FOCUS_LABELS, lesson.focus)}
                </Badge>
                <Badge
                  variant={lesson.reportStatus === "final" ? "success" : lesson.reportStatus === "draft" ? "warning" : "secondary"}
                  className="text-[10px]"
                >
                  Laporan: {labelOf(REPORT_STATUS_LABELS, lesson.reportStatus)}
                </Badge>
              </div>
            </div>
          </div>

          <ul className="flex flex-col gap-1.5">
            {facts.map((fact) => (
              <li key={fact.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <fact.icon className="size-3.5 shrink-0" />
                <span className="min-w-0 truncate">{fact.label}</span>
              </li>
            ))}
            {lesson.invoiceId ? (
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <FcMoneyTransfer className="size-3.5 shrink-0" />
                <Link href={`/invoices/${lesson.invoiceId}`} className="hover:underline">
                  Sudah masuk ke tagihan
                </Link>
              </li>
            ) : null}
            {lesson.isBillable && !lesson.invoiceId && lesson.attendance === "present" ? (
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <FcMoneyTransfer className="size-3.5 shrink-0" />
                <span>Dihitung ke tagihan bulan ini</span>
              </li>
            ) : null}
            {!lesson.isBillable ? (
              <li className="flex items-center gap-2 text-xs text-muted-foreground">
                <FcMoneyTransfer className="size-3.5 shrink-0" />
                <span>Tidak ditagihkan</span>
              </li>
            ) : null}
          </ul>

          <LessonActions
            lessonId={lesson.id}
            date={lesson.date}
            startTime={lesson.startTime}
            status={lesson.status}
            cancelReason={lesson.cancelReason}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FcDocument className="size-4" />
            Laporan untuk orang tua
            {lesson.reportGeneratedBy === "ai" ? (
              <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                <Sparkles className="size-3" />
                AI
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lesson.reportText ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{lesson.reportText}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {lesson.status === "completed"
                ? "Laporan belum diisi — orang tua belum menerima kabar pertemuan ini."
                : "Laporan bisa diisi setelah pertemuan diselesaikan."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Catatan mengajar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {[
            { label: "Materi / topik", value: lesson.topicLabel },
            { label: "Materi yang dibahas", value: lesson.material },
            { label: "Kegiatan belajar", value: lesson.activities },
            { label: "Catatan internal", value: lesson.notes },
          ].map((item) =>
            item.value ? (
              <div key={item.label}>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{item.label}</p>
                <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground/90">{item.value}</p>
              </div>
            ) : null,
          )}
          {!lesson.topicLabel && !lesson.material && !lesson.activities && !lesson.notes ? (
            <p className="text-xs text-muted-foreground">Belum ada catatan untuk pertemuan ini.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Paperclip className="size-4 text-primary" />
            Lampiran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LessonAttachmentSection lessonId={lesson.id} attachments={attachments} />
        </CardContent>
      </Card>

      <Button asChild variant="ghost" size="sm" className="self-start text-xs text-muted-foreground">
        <Link href="/schedule">Kembali ke jadwal</Link>
      </Button>
    </div>
  );
}
