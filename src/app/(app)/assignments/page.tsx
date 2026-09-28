import { Sparkles } from "lucide-react";
import Link from "next/link";
import { FcTodoList } from "react-icons/fc";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { formatDateShort, pluralize } from "@/lib/datetime";
import { ASSIGNMENT_STATUS_LABELS, DIFFICULTY_LABELS, labelOf } from "@/lib/domain/labels";
import { assignmentsForTutor, type AssignmentListItem } from "@/lib/services/assignments";

const STATUS_FILTERS = [
  { value: "", label: "Semua" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Aktif" },
  { value: "archived", label: "Arsip" },
] as const;

function statusVariant(status: string) {
  if (status === "published") return "success" as const;
  if (status === "archived") return "secondary" as const;
  return "outline" as const;
}

function filterLink(status: string, student: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (student) params.set("student", student);
  const query = params.toString();
  return query ? `/assignments?${query}` : "/assignments";
}

export default async function AssignmentsPage(props: PageProps<"/assignments">) {
  const user = await requireTutor();
  const params = await props.searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const studentFilter = typeof params.student === "string" ? params.student : "";

  const all = await assignmentsForTutor(user.id);
  const studentId = Number(studentFilter);
  const filtered = all.filter((item) => {
    if (status && item.assignment.status !== status) return false;
    if (Number.isInteger(studentId) && studentId > 0 && item.assignment.studentId !== studentId) return false;
    return true;
  });

  const students = new Map<number, AssignmentListItem>();
  for (const item of all) {
    if (!students.has(item.assignment.studentId)) students.set(item.assignment.studentId, item);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Tugas"
        description={`${pluralize(filtered.length, "tugas")}${status || studentFilter ? " sesuai filter" : ""}`}
        action={
          <Button asChild size="sm">
            <Link href="/assignments/new">Buat</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((option) => (
          <Button
            key={option.value || "all"}
            asChild
            size="sm"
            variant={option.value === status ? "default" : "outline"}
            className="h-8 text-xs"
          >
            <Link href={filterLink(option.value, studentFilter)}>{option.label}</Link>
          </Button>
        ))}
      </div>

      {students.size > 1 ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant={studentFilter ? "outline" : "secondary"} className="h-8 text-xs">
            <Link href={filterLink(status, "")}>Semua murid</Link>
          </Button>
          {[...students.values()].map((item) => (
            <Button
              key={item.assignment.studentId}
              asChild
              size="sm"
              variant={String(item.assignment.studentId) === studentFilter ? "secondary" : "ghost"}
              className="h-8 text-xs"
            >
              <Link href={filterLink(status, String(item.assignment.studentId))}>
                {item.studentNickname || item.studentName}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={FcTodoList}
          title={all.length === 0 ? "Belum ada tugas" : "Tidak ada tugas yang cocok"}
          description={
            all.length === 0
              ? "Buat soal latihan untuk murid, lalu minta mereka mengerjakannya di rumah."
              : "Coba ubah filter status atau pilih murid lain."
          }
          action={
            all.length === 0 ? (
              <Button asChild size="sm">
                <Link href="/assignments/new">Buat tugas</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((item) => (
            <Link
              key={item.assignment.id}
              href={`/assignments/${item.assignment.id}`}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
            >
              <StudentAvatar name={item.studentName} color={item.studentColor} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold">{item.assignment.title}</p>
                  {item.assignment.aiGenerated ? <Sparkles className="size-3 shrink-0 text-primary" /> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {item.studentNickname || item.studentName}
                  {item.programName ? ` · ${item.programName}` : ""}
                  {item.assignment.material ? ` · ${item.assignment.material}` : ""}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant={statusVariant(item.assignment.status)} className="text-[10px]">
                    {labelOf(ASSIGNMENT_STATUS_LABELS, item.assignment.status)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {labelOf(DIFFICULTY_LABELS, item.assignment.difficulty)}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    {pluralize(item.questionCount, "soal")}
                    {item.attemptCount > 0 ? ` · ${pluralize(item.attemptCount, "pengerjaan")}` : ""}
                    {item.bestScore !== null ? ` · terbaik ${item.bestScore}` : ""}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatDateShort(item.assignment.createdAt.toISOString().slice(0, 10))}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
