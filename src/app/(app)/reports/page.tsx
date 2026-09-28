import { Search } from "lucide-react";
import { FcComments } from "react-icons/fc";
import Link from "next/link";
import { ReportDialog } from "@/components/report/report-dialog";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { formatDateShort, pluralize } from "@/lib/datetime";
import { UPDATE_KIND_LABELS, UPDATE_STATUS_LABELS, labelOf } from "@/lib/domain/labels";
import { checkItemsForUpdates, listParentUpdates } from "@/lib/services/reports";
import { listStudents } from "@/lib/services/students";

type UpdateStatus = "draft" | "final" | "sent";
type UpdateKind = "weekly" | "monthly" | "brief" | "daily" | "custom";

const STATUSES = Object.keys(UPDATE_STATUS_LABELS) as UpdateStatus[];
const KINDS = Object.keys(UPDATE_KIND_LABELS) as UpdateKind[];

function isStatus(value: unknown): value is UpdateStatus {
  return typeof value === "string" && STATUSES.includes(value as UpdateStatus);
}

function isKind(value: unknown): value is UpdateKind {
  return typeof value === "string" && KINDS.includes(value as UpdateKind);
}

function filterHref(
  status?: string,
  studentId?: string,
  search?: string,
  kind?: string,
): string {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (studentId) query.set("studentId", studentId);
  if (kind) query.set("kind", kind);
  if (search) query.set("q", search);
  const suffix = query.toString();
  return suffix ? `/reports?${suffix}` : "/reports";
}

function statusTone(status: string): "secondary" | "info" | "success" {
  if (status === "sent") return "success";
  if (status === "final") return "info";
  return "secondary";
}

export default async function ReportsPage(props: PageProps<"/reports">) {
  const user = await requireTutor();
  const params = await props.searchParams;

  const search = typeof params.q === "string" ? params.q : "";
  const status = isStatus(params.status) ? params.status : undefined;
  const kind = isKind(params.kind) ? params.kind : undefined;
  const studentId =
    typeof params.studentId === "string" && Number.isInteger(Number(params.studentId))
      ? Number(params.studentId)
      : undefined;

  const [reports, students] = await Promise.all([
    listParentUpdates(user.id, { search, status, kind, studentId }),
    listStudents(user.id, {}),
  ]);

  const hasFilter = Boolean(search || status || kind || studentId);
  const studentOptions = students.map((student) => ({
    id: student.id,
    name: student.name,
    nickname: student.nickname,
    reportFormat: student.reportFormat,
    periodStart: student.periodStart,
    periodEnd: student.periodEnd,
    parentPhone: student.parentPhone,
  }));
  const checkItemsByUpdate = await checkItemsForUpdates(reports.map((row) => row.update.id));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Laporan"
        description={`${pluralize(reports.length, "rangkuman")} untuk orang tua`}
        action={
          studentOptions.length > 0 ? (
            <ReportDialog students={studentOptions} defaultStudentId={studentId} />
          ) : undefined
        }
      />

      <form method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search}
            placeholder="Cari judul atau isi rangkuman…"
            className="pl-9"
            aria-label="Cari rangkuman"
          />
        </div>
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {kind ? <input type="hidden" name="kind" value={kind} /> : null}
        {studentId ? <input type="hidden" name="studentId" value={studentId} /> : null}
        <Button type="submit" variant="outline">
          Cari
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button asChild size="sm" variant={status || kind ? "ghost" : "secondary"}>
          <Link href={filterHref(undefined, studentId ? String(studentId) : undefined, search)}>Semua</Link>
        </Button>
        {KINDS.map((value) => (
          <Button key={value} asChild size="sm" variant={kind === value ? "secondary" : "ghost"}>
            <Link
              href={filterHref(
                status,
                studentId ? String(studentId) : undefined,
                search,
                kind === value ? undefined : value,
              )}
            >
              {UPDATE_KIND_LABELS[value]}
            </Link>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button asChild size="sm" variant={status ? "ghost" : "secondary"}>
          <Link href={filterHref(undefined, studentId ? String(studentId) : undefined, search, kind)}>Semua status</Link>
        </Button>
        {STATUSES.map((value) => (
          <Button key={value} asChild size="sm" variant={status === value ? "secondary" : "ghost"}>
            <Link href={filterHref(value, studentId ? String(studentId) : undefined, search, kind)}>
              {UPDATE_STATUS_LABELS[value]}
            </Link>
          </Button>
        ))}
      </div>

      {hasFilter ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Filter aktif</span>
          <Link href="/reports" className="font-medium text-primary hover:underline">
            Reset filter
          </Link>
        </div>
      ) : null}

      {reports.length === 0 ? (
        <EmptyState
          icon={FcComments}
          title={hasFilter ? "Tidak ada rangkuman yang cocok" : "Belum ada rangkuman"}
          description={
            hasFilter
              ? "Coba kata kunci atau filter lain."
              : "Rangkum perkembangan anak dari sesi les, lalu kirim ke orang tua."
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {reports.map(({ update, studentName, studentNickname, studentColor }) => (
            <div
              key={update.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40"
            >
              <StudentAvatar name={studentName} color={studentColor ?? undefined} size="md" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/reports/${update.id}`} className="truncate text-sm font-bold hover:underline">
                    {update.title}
                  </Link>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {labelOf(UPDATE_KIND_LABELS, update.kind)}
                  </Badge>
                  <Badge variant={statusTone(update.status)} className="shrink-0 text-[10px]">
                    {labelOf(UPDATE_STATUS_LABELS, update.status)}
                  </Badge>
                  {update.format === "checklist" ? (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      Checklist
                    </Badge>
                  ) : null}
                  {update.aiGenerated ? (
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      AI
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {studentNickname || studentName} · {formatDateShort(update.periodStart)} –{" "}
                  {formatDateShort(update.periodEnd)}
                </p>
                {update.body.trim() ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{update.body}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pluralize(checkItemsByUpdate.get(update.id)?.length ?? 0, "item checklist")}
                  </p>
                )}
              </div>

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
                  checkItems: (checkItemsByUpdate.get(update.id) ?? []).map((item) => ({
                    label: item.label,
                    checked: item.checked,
                    reason: item.reason,
                  })),
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
