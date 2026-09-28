import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { IconType } from "react-icons";
import { FcAlarmClock, FcCalendar, FcFlashOn, FcMindMap, FcReading, FcSalesPerformance } from "react-icons/fc";
import { notFound } from "next/navigation";
import { ReportChecklist } from "@/components/report/report-checklist";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireParent } from "@/lib/auth";
import { accessibleStudentIds, getStudentForUser } from "@/lib/authz";
import { accentOf } from "@/lib/domain/colors";
import { formatDateShort } from "@/lib/datetime";
import { UPDATE_KIND_LABELS, labelOf } from "@/lib/domain/labels";
import { getParentUpdateForParent, listCheckItems } from "@/lib/services/reports";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Laporan" };

/** Ikon per jenis laporan — sama seperti daftar, supaya konsisten. */
const KIND_ICON: Record<string, IconType> = {
  weekly: FcCalendar,
  monthly: FcSalesPerformance,
  brief: FcFlashOn,
  daily: FcAlarmClock,
  custom: FcMindMap,
};

/** Pecah teks jadi paragraf (baris kosong = pemisah) supaya laporan panjang tidak jadi satu blok padat. */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default async function ParentReportDetailPage({ params }: PageProps<"/parent/reports/[id]">) {
  const parent = await requireParent();
  const routeParams = await params;
  const updateId = Number(routeParams.id);
  if (!Number.isInteger(updateId) || updateId <= 0) notFound();

  const ids = await accessibleStudentIds(parent);
  const update = await getParentUpdateForParent(ids, updateId);
  if (!update) notFound();

  const [student, checkItems] = await Promise.all([
    getStudentForUser(parent, update.studentId),
    listCheckItems(update.id),
  ]);
  const studentName = student?.name ?? "Anak Anda";
  const accent = accentOf(student?.color);
  const KindIcon = KIND_ICON[update.kind] ?? FcReading;

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="self-start text-muted-foreground">
        <Link href="/parent/reports">
          <ArrowLeft />
          Semua laporan
        </Link>
      </Button>

      <div className={cn("rounded-3xl bg-gradient-to-br p-5", accent.gradient)}>
        <div className="flex items-start gap-3">
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", accent.soft)}>
            <KindIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("text-xs font-semibold tracking-wide uppercase", accent.text)}>
              {labelOf(UPDATE_KIND_LABELS, update.kind)}
            </p>
            <h1 className="mt-0.5 text-xl leading-snug font-bold tracking-tight text-foreground">{update.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateShort(update.periodStart)} – {formatDateShort(update.periodEnd)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-background/70 py-1 pr-3 pl-1">
            <StudentAvatar name={studentName} color={student?.color ?? undefined} size="xs" />
            <span className="text-xs font-semibold text-foreground">{student?.nickname || studentName}</span>
          </div>
          {update.aiGenerated ? (
            <Badge variant="outline" className="bg-background/70">
              <Sparkles />
              Dibantu AI
            </Badge>
          ) : null}
          {update.sentAt ? (
            <Badge variant="outline" className="bg-background/70">
              Dikirim {update.sentAt.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </Badge>
          ) : null}
        </div>
      </div>

      {update.body.trim() ? (
        <article className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className={cn("h-1", accent.solid)} />
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", accent.soft, accent.text)}>
                <FcReading className="size-3.5" />
              </span>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Catatan pengajar</p>
            </div>
            <div className="flex flex-col gap-3.5">
              {splitParagraphs(update.body).map((paragraph, index) => (
                <p key={index} className="text-[15px] leading-7 whitespace-pre-wrap text-foreground/90">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </article>
      ) : null}

      {checkItems.length > 0 ? (
        <div>
          <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Progress belajar
          </p>
          <ReportChecklist items={checkItems} />
        </div>
      ) : null}
    </div>
  );
}
