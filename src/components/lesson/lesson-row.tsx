import { CalendarDays, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompleteLessonSheet, type CompletableLesson } from "@/components/lesson/complete-lesson-sheet";
import { STATUS_LABELS, labelOf } from "@/lib/domain/labels";
import { formatDateLong, timeRangeLabel } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { TodayLesson } from "@/lib/services/stats";

export function toCompletable(entry: TodayLesson): CompletableLesson {
  const { lesson } = entry;
  return {
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
    studentName: entry.studentName,
    studentNickname: entry.studentNickname,
    studentColor: entry.studentColor,
    programName: entry.programName,
    programSubject: null,
  };
}

const STATUS_TONE: Record<string, "default" | "success" | "destructive" | "secondary"> = {
  scheduled: "secondary",
  completed: "success",
  cancelled: "destructive",
  moved: "default",
};

export function LessonRow({
  entry,
  showDate = false,
  showLocation = false,
  className,
}: {
  entry: TodayLesson;
  showDate?: boolean;
  showLocation?: boolean;
  className?: string;
}) {
  const lesson = entry.lesson;
  const name = entry.studentNickname || entry.studentName;
  const done = lesson.status === "completed";
  const cancelled = lesson.status === "cancelled";

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3 transition-colors",
        cancelled && "opacity-60",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <StudentAvatar name={entry.studentName} color={entry.studentColor} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/lessons/${lesson.id}`} className="min-w-0 hover:underline">
              <p className="truncate text-sm font-bold text-foreground">{name}</p>
            </Link>
            <Badge variant={STATUS_TONE[lesson.status] ?? "default"} className="shrink-0 text-[10px]">
              {labelOf(STATUS_LABELS, lesson.status)}
            </Badge>
          </div>

          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{entry.programName}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {timeRangeLabel(lesson.startTime, lesson.endTime)}
            </span>
            {showDate ? (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" />
                {formatDateLong(lesson.date)}
              </span>
            ) : null}
            {lesson.movedToId || lesson.movedFromId ? <span>Dipindahkan</span> : null}
          </p>

          {lesson.topicLabel ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">{lesson.topicLabel}</p>
          ) : null}

          {done && lesson.reportText ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lesson.reportText}</p>
          ) : null}

          {done && !lesson.reportText ? (
            <p className="mt-1 text-xs font-medium text-warning-foreground">Laporan belum diisi — orang tua belum menerima kabar.</p>
          ) : null}
        </div>
      </div>

      {!cancelled ? (
        <div className="mt-2.5 flex items-center justify-end gap-2">
          <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
            <Link href={`/lessons/${lesson.id}`}>
              {showLocation ? <MapPin className="size-3.5" /> : null}
              Detail
            </Link>
          </Button>
          <CompleteLessonSheet
            lesson={toCompletable(entry)}
            variant={done ? "outline" : "default"}
            size="sm"
            className="h-8 text-xs"
          />
        </div>
      ) : null}
    </div>
  );
}
