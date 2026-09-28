import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { IconType } from "react-icons";
import { FcAlarmClock, FcCalendar, FcComments, FcFlashOn, FcMindMap, FcSalesPerformance } from "react-icons/fc";
import { ChildrenFilter } from "../../children-filter";
import { TopPanel } from "@/components/top-panel";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StudentAvatar } from "@/components/student-avatar";
import { requireParent } from "@/lib/auth";
import { accessibleStudentIds, getStudentForUser } from "@/lib/authz";
import { accentOf } from "@/lib/domain/colors";
import { currentPeriodFor, formatDateShort, pluralize, relativeDayLabel, todayKey } from "@/lib/datetime";
import { parentUpdatesForStudents } from "@/lib/services/reports";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Laporan" };

/** Ikon per jenis laporan supaya daftar terasa lebih hidup, bukan cuma satu ikon berulang. */
const KIND_ICON: Record<string, IconType> = {
  weekly: FcCalendar,
  monthly: FcSalesPerformance,
  brief: FcFlashOn,
  daily: FcAlarmClock,
  custom: FcMindMap,
};

type PeriodSummary = {
  studentId: number;
  name: string;
  color: string | null;
  periodStart: string;
  periodEnd: string;
  countInPeriod: number;
  total: number;
};

function overlapsPeriod(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA <= endB && endA >= startB;
}

export default async function ParentReportsPage({ searchParams }: PageProps<"/parent/reports">) {
  const parent = await requireParent();
  const params = await searchParams;
  const requested = Number(params?.student);
  const selected = Number.isInteger(requested) && requested > 0 ? requested : null;

  const ids = await accessibleStudentIds(parent);
  const visible = selected && ids.includes(selected) ? [selected] : ids;

  const [updates, rows] = await Promise.all([
    parentUpdatesForStudents(visible),
    Promise.all(visible.map((id) => getStudentForUser(parent, id))),
  ]);
  const students = rows.filter((student): student is NonNullable<typeof student> => student !== null);

  const options = students.map((student) => ({ studentId: student.id, name: student.name, nickname: student.nickname }));
  const byStudent = new Map<number, typeof updates>();
  for (const update of updates) {
    const list = byStudent.get(update.update.studentId) ?? [];
    list.push(update);
    byStudent.set(update.update.studentId, list);
  }
  const sections = students
    .map((student) => ({ student, items: byStudent.get(student.id) ?? [] }))
    .filter((entry) => entry.items.length > 0);

  const today = todayKey();
  const periodSummaries: PeriodSummary[] = students.map((student) => {
    const period = currentPeriodFor(student.periodStart, today);
    const items = byStudent.get(student.id) ?? [];
    const countInPeriod = items.filter(({ update }) =>
      overlapsPeriod(update.periodStart, update.periodEnd, period.periodStart, period.periodEnd),
    ).length;
    return {
      studentId: student.id,
      name: student.nickname || student.name,
      color: student.color,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      countInPeriod,
      total: items.length,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <TopPanel>
        <PageHeader
          title="Laporan"
          description={updates.length === 0 ? "Rangkuman perkembangan belajar anak Anda akan muncul di sini." : undefined}
        />

        {periodSummaries.length === 1 ? (
          <div className="mt-3 rounded-2xl bg-background/70 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <FcCalendar className="size-3.5" />
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Periode berjalan</p>
              </div>
              <span className="text-xs font-semibold text-foreground">
                {formatDateShort(periodSummaries[0].periodStart)} – {formatDateShort(periodSummaries[0].periodEnd)}
              </span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-background/80 p-2.5 text-center">
                <p className="text-lg font-bold tabular-nums text-foreground">{periodSummaries[0].countInPeriod}</p>
                <p className="text-[10px] text-muted-foreground">Laporan periode ini</p>
              </div>
              <div className="rounded-xl bg-background/80 p-2.5 text-center">
                <p className="text-lg font-bold tabular-nums text-foreground">{periodSummaries[0].total}</p>
                <p className="text-[10px] text-muted-foreground">Total laporan</p>
              </div>
            </div>
          </div>
        ) : periodSummaries.length > 1 ? (
          <div className="mt-3 rounded-2xl bg-background/70 p-3.5">
            <div className="flex items-center gap-1.5">
              <FcCalendar className="size-3.5" />
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Periode berjalan tiap anak</p>
            </div>
            <div className="mt-1.5 flex flex-col divide-y divide-border/50">
              {periodSummaries.map((summary) => (
                <div key={summary.studentId} className="flex items-center justify-between gap-2 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("size-2 shrink-0 rounded-full", accentOf(summary.color).dot)} />
                    <span className="truncate text-sm font-medium text-foreground">{summary.name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {pluralize(summary.countInPeriod, "laporan")} · {formatDateShort(summary.periodStart)}–
                    {formatDateShort(summary.periodEnd)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </TopPanel>

      <ChildrenFilter basePath="/parent/reports" options={options} selected={selected} />

      {sections.length === 0 ? (
        <EmptyState
          icon={FcComments}
          title="Belum ada laporan"
          description="Pengajar akan mengirim rangkuman perkembangan setelah beberapa sesi les berjalan."
        />
      ) : (
        sections.map(({ student, items }) => {
          const accent = accentOf(student.color);
          return (
            <section key={student.id} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 px-1">
                <StudentAvatar name={student.name} color={student.color} size="xs" />
                <h2 className="text-sm font-bold text-foreground">{student.nickname || student.name}</h2>
                <span className="ml-auto text-xs text-muted-foreground">{pluralize(items.length, "laporan")}</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {items.map(({ update }, index) => {
                  const Icon = KIND_ICON[update.kind] ?? FcComments;
                  return (
                    <Link
                      key={update.id}
                      href={`/parent/reports/${update.id}`}
                      className="group flex items-start gap-3 rounded-2xl border border-border/70 bg-card p-3.5 transition-all hover:border-border hover:shadow-sm active:scale-[0.99]"
                    >
                      <span className={cn("mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl", accent.soft)}>
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-foreground">{update.title}</span>
                          {index === 0 ? (
                            <Badge className={cn("shrink-0 border-transparent text-[9px]", accent.soft, accent.text)}>
                              Terbaru
                            </Badge>
                          ) : null}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className={cn("font-semibold", accent.text)}>{relativeDayLabel(update.periodEnd)}</span>
                          <span className="text-muted-foreground">
                            · {formatDateShort(update.periodStart)} – {formatDateShort(update.periodEnd)}
                          </span>
                        </span>
                        {update.body.trim() ? (
                          <span className="mt-1.5 line-clamp-2 block text-xs leading-relaxed text-foreground/70">
                            {update.body}
                          </span>
                        ) : update.format === "checklist" ? (
                          <span className="mt-1.5 block text-xs text-muted-foreground">Progress checklist tersedia</span>
                        ) : null}
                        {update.format === "checklist" || update.aiGenerated ? (
                          <span className="mt-2 flex flex-wrap items-center gap-1.5">
                            {update.format === "checklist" ? (
                              <Badge variant="outline" className="text-[10px]">
                                Checklist
                              </Badge>
                            ) : null}
                            {update.aiGenerated ? (
                              <Badge variant="accent" className="text-[10px]">
                                AI
                              </Badge>
                            ) : null}
                          </span>
                        ) : null}
                      </span>
                      <ChevronRight className="mt-2.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
