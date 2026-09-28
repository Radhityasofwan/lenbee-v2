import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip, Sparkles } from "lucide-react";
import { FcCalendar, FcCamera, FcClock, FcDocument, FcGraduationCap } from "react-icons/fc";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireParent } from "@/lib/auth";
import { accessibleStudentIds, getStudentForUser } from "@/lib/authz";
import { accentOf } from "@/lib/domain/colors";
import { formatDateLong, formatDuration, timeRangeLabel } from "@/lib/datetime";
import { ATTENDANCE_LABELS, FOCUS_LABELS, labelOf } from "@/lib/domain/labels";
import { attachmentsForLesson } from "@/lib/services/attachments";
import { lessonForStudents } from "@/lib/services/sessions";
import { programsForStudent } from "@/lib/services/students";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Laporan Pertemuan" };

const CANCEL_LABEL: Record<string, string> = {
  cancelled: "Dibatalkan pengajar",
  student_absent: "Anak tidak hadir",
  tutor_absent: "Pengajar berhalangan",
  holiday: "Libur",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileUrl(storageKey: string): string {
  return `/api/files/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

export default async function ParentLessonReportPage(props: PageProps<"/parent/schedule/[id]">) {
  const parent = await requireParent();
  const { id } = await props.params;
  const lessonId = Number(id);
  if (!Number.isInteger(lessonId) || lessonId <= 0) notFound();

  const ids = await accessibleStudentIds(parent);
  const lesson = await lessonForStudents(ids, lessonId);
  // Baris `moved` hanya penanda jadwal lama; laporan yang dibaca orang tua ada di pertemuan pengganti.
  if (!lesson || lesson.status === "moved") notFound();

  const [student, programRows, attachments] = await Promise.all([
    getStudentForUser(parent, lesson.studentId).catch(() => null),
    programsForStudent(lesson.studentId),
    attachmentsForLesson(lesson.id),
  ]);
  if (!student) notFound();

  const programName = programRows.find((program) => program.id === lesson.programId)?.name ?? "Program les";
  const name = student.nickname || student.name;
  const accent = accentOf(student.color);
  const imageAttachments = attachments.filter((a) => a.mimeType.startsWith("image/"));
  const fileAttachments = attachments.filter((a) => !a.mimeType.startsWith("image/"));

  const facts = [
    { icon: FcCalendar, label: formatDateLong(lesson.date) },
    { icon: FcClock, label: `${timeRangeLabel(lesson.startTime, lesson.endTime)} · ${formatDuration(lesson.durationMinutes)}` },
    { icon: FcGraduationCap, label: programName },
  ];

  const taught = [
    { label: "Materi yang dibahas", value: lesson.material },
    { label: "Kegiatan belajar", value: lesson.activities },
  ].filter((item) => item.value);

  const statusBadge =
    lesson.status === "cancelled" ? (
      <Badge variant="destructive" className="text-[10px]">
        {CANCEL_LABEL[lesson.cancelReason ?? "cancelled"] ?? "Dibatalkan"}
      </Badge>
    ) : lesson.status === "completed" ? (
      lesson.attendance === "absent" ? (
        <Badge variant="warning" className="text-[10px]">
          Tidak hadir
        </Badge>
      ) : (
        <Badge variant="success" className="text-[10px]">
          Selesai
        </Badge>
      )
    ) : (
      <Badge variant="secondary" className="text-[10px]">
        Terjadwal
      </Badge>
    );

  return (
    <div className="flex flex-col gap-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start text-xs text-muted-foreground">
        <Link href="/parent/schedule">
          <ArrowLeft />
          Jadwal
        </Link>
      </Button>

      <PageHeader title={name} description={`${programName} · ${formatDateLong(lesson.date)}`} />

      <Card className="overflow-hidden">
        <div className={cn("h-1.5 w-full", accent.solid)} />
        <CardContent className="flex flex-col gap-3 pt-4">
          <div className="flex items-center gap-3">
            <StudentAvatar
              name={student.name}
              color={student.color}
              className={cn("ring-2 ring-offset-2 ring-offset-card", accent.ring)}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{student.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {statusBadge}
                {lesson.status === "completed" ? (
                  <Badge variant="outline" className="text-[10px]">
                    {labelOf(ATTENDANCE_LABELS, lesson.attendance)}
                  </Badge>
                ) : null}
                <Badge variant="outline" className="text-[10px]">
                  {labelOf(FOCUS_LABELS, lesson.focus)}
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
          </ul>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className={cn("bg-gradient-to-br", accent.gradient)}>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FcDocument className="size-4" />
            Laporan pertemuan
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
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">{lesson.reportText}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {lesson.status === "completed"
                ? "Pengajar belum menulis laporan untuk pertemuan ini."
                : "Laporan tersedia setelah pertemuan selesai."}
            </p>
          )}
        </CardContent>
      </Card>

      {taught.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Catatan belajar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lesson.topicLabel ? (
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Materi / topik</p>
                <p className="mt-0.5 text-sm text-foreground/90">{lesson.topicLabel}</p>
              </div>
            ) : null}
            {taught.map((item) => (
              <div key={item.label}>
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{item.label}</p>
                <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground/90">{item.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {imageAttachments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FcCamera className="size-4" />
              Aktivitas belajar
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {imageAttachments.map((attachment) => (
              <a
                key={attachment.id}
                href={fileUrl(attachment.storageKey)}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl(attachment.storageKey)}
                  alt={attachment.originalName}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {fileAttachments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Paperclip className="size-4 text-primary" />
              Lampiran
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {fileAttachments.map((attachment) => (
              <a
                key={attachment.id}
                href={fileUrl(attachment.storageKey)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-lg border border-border p-2.5 transition-colors hover:bg-muted"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <FcDocument className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{attachment.originalName}</span>
                  <span className="block text-xs text-muted-foreground">{formatBytes(attachment.size)}</span>
                </span>
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
