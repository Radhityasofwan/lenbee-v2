import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { accentOf } from "@/lib/domain/colors";
import { formatDuration } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { LessonSession } from "@/db/schema";

export type ScheduleEntry = {
  lesson: LessonSession;
  studentName: string;
  studentColor?: string | null;
  programName: string;
};

type BadgeTone = "success" | "destructive" | "secondary" | "warning";

const FOCUS_LABEL: Record<LessonSession["focus"], string> = {
  routine: "Latihan rutin",
  review: "Ulasan materi",
  exam_prep: "Persiapan ujian",
  homework: "Bantuan PR",
  remedial: "Perbaikan",
  other: "Pertemuan les",
};

const CANCEL_LABEL: Record<string, string> = {
  cancelled: "Dibatalkan",
  student_absent: "Anak tidak hadir",
  tutor_absent: "Pengajar berhalangan",
  holiday: "Libur",
};

/** Label + warna status yang mudah dibaca orang tua. */
function statusInfo(lesson: LessonSession): { label: string; tone: BadgeTone } {
  if (lesson.status === "cancelled") {
    return { label: CANCEL_LABEL[lesson.cancelReason ?? "cancelled"] ?? "Dibatalkan", tone: "destructive" };
  }
  if (lesson.status === "completed") {
    return lesson.attendance === "absent"
      ? { label: "Tidak hadir", tone: "warning" }
      : { label: "Selesai", tone: "success" };
  }
  if (lesson.status === "moved") return { label: "Dipindahkan", tone: "secondary" };
  return { label: "Terjadwal", tone: "secondary" };
}

export function LessonItem({
  entry,
  showChild,
  href,
}: {
  entry: ScheduleEntry;
  showChild: boolean;
  href?: string;
}) {
  const { lesson } = entry;
  const status = statusInfo(lesson);
  const accent = showChild ? accentOf(entry.studentColor) : null;
  const detail = [showChild ? entry.studentName : null, lesson.topicLabel ?? FOCUS_LABEL[lesson.focus]]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <>
      <div
        className={cn(
          "flex size-10 shrink-0 flex-col items-center justify-center rounded-lg leading-tight",
          accent ? cn(accent.soft, accent.text) : "bg-muted",
        )}
      >
        <span className="text-[11px] font-semibold">{lesson.startTime.slice(0, 5)}</span>
        <span className={cn("text-[9px]", accent ? "opacity-80" : "text-muted-foreground")}>
          {lesson.endTime.slice(0, 5)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{entry.programName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {detail} · {formatDuration(lesson.durationMinutes)}
        </p>
      </div>

      <Badge variant={status.tone} className="shrink-0 text-[10px]">
        {status.label}
      </Badge>
    </>
  );

  const rowClassName = cn(
    "flex items-center gap-3 rounded-lg py-2.5 pr-2.5 pl-2.5",
    accent && "border-l-4 pl-2",
    accent?.border,
  );

  if (!href) {
    return <div className={rowClassName}>{body}</div>;
  }

  return (
    <Link href={href} className={cn(rowClassName, "transition-colors hover:bg-muted")}>
      {body}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
