import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportChecklist } from "@/components/report/report-checklist";
import { ReportDialog } from "@/components/report/report-dialog";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { formatDateShort } from "@/lib/datetime";
import { REPORT_FORMAT_LABELS, UPDATE_KIND_LABELS, UPDATE_STATUS_LABELS, labelOf } from "@/lib/domain/labels";
import { ReportError, getOwnedParentUpdate, listCheckItems } from "@/lib/services/reports";
import { getOwnedStudent, listStudents } from "@/lib/services/students";

function statusTone(status: string): "secondary" | "info" | "success" {
  if (status === "sent") return "success";
  if (status === "final") return "info";
  return "secondary";
}

export default async function ReportDetailPage(props: PageProps<"/reports/[id]">) {
  const user = await requireTutor();
  const params = await props.params;
  const updateId = Number(params.id);
  if (!Number.isInteger(updateId) || updateId <= 0) notFound();

  const update = await getOwnedParentUpdate(user.id, updateId).catch((error: unknown) => {
    if (error instanceof ReportError) return null;
    throw error;
  });
  if (!update) notFound();

  const [student, students, checkItems] = await Promise.all([
    getOwnedStudent(user.id, update.studentId).catch(() => null),
    listStudents(user.id, {}),
    listCheckItems(update.id),
  ]);

  const studentName = student?.name ?? "Murid";
  const studentOptions = students.map((item) => ({
    id: item.id,
    name: item.name,
    nickname: item.nickname,
    reportFormat: item.reportFormat,
    periodStart: item.periodStart,
    periodEnd: item.periodEnd,
    parentPhone: item.parentPhone,
  }));

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" size="sm" className="self-start text-muted-foreground">
        <Link href="/reports">
          <ArrowLeft />
          Semua laporan
        </Link>
      </Button>

      <PageHeader
        title={update.title}
        description={`${studentName} · ${formatDateShort(update.periodStart)} – ${formatDateShort(update.periodEnd)}`}
        action={
          <ReportDialog
            students={studentOptions}
            report={{
              id: update.id,
              title: update.title,
              studentId: update.studentId,
              periodStart: update.periodStart,
              periodEnd: update.periodEnd,
              body: update.body,
              kind: update.kind,
              format: update.format,
              status: update.status,
              aiGenerated: update.aiGenerated,
              checkItems: checkItems.map((item) => ({
                label: item.label,
                checked: item.checked,
                reason: item.reason,
              })),
            }}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StudentAvatar name={studentName} color={student?.color ?? undefined} size="sm" />
        <span className="text-sm font-medium">{student?.nickname || studentName}</span>
        <Badge variant="outline">{labelOf(UPDATE_KIND_LABELS, update.kind)}</Badge>
        {update.format === "checklist" ? (
          <Badge variant="outline">{labelOf(REPORT_FORMAT_LABELS, update.format)}</Badge>
        ) : null}
        <Badge variant={statusTone(update.status)}>{labelOf(UPDATE_STATUS_LABELS, update.status)}</Badge>
        {update.aiGenerated ? (
          <Badge variant="outline">
            <Sparkles />
            AI
          </Badge>
        ) : null}
      </div>

      {update.body.trim() ? (
        <article className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm whitespace-pre-wrap text-foreground">{update.body}</p>
        </article>
      ) : null}

      <ReportChecklist items={checkItems} />

      {update.sentAt ? (
        <p className="text-xs text-muted-foreground">
          Dikirim{" "}
          {update.sentAt.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      ) : null}
    </div>
  );
}
