import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Quote, Sparkles, Wallet } from "lucide-react";
import { FcCalendar, FcCamera, FcConferenceCall, FcGraduationCap, FcPaid, FcReading } from "react-icons/fc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StudentAvatar } from "@/components/student-avatar";
import { TopPanel } from "@/components/top-panel";
import { requireParent } from "@/lib/auth";
import { accentOf } from "@/lib/domain/colors";
import {
  MONTH_NAMES_ID,
  formatCurrency,
  formatDateLong,
  formatDateShort,
  parseDateKey,
  relativeDayLabel,
  todayKey,
} from "@/lib/datetime";
import { parentDashboard, type ParentDashboard } from "@/lib/services/stats";
import { cn } from "@/lib/utils";

/** Tanggal singkat gaya "sobekan kalender" — dipakai kartu Terakhir belajar. */
function dateBadgeParts(dateKey: string): { day: string; month: string } {
  const parsed = parseDateKey(dateKey);
  return { day: String(parsed.getDate()), month: MONTH_NAMES_ID[parsed.getMonth()]?.slice(0, 3) ?? "" };
}

export const metadata: Metadata = { title: "Beranda" };

function attemptTone(
  score: number | null,
  maxScore: number,
): "success" | "warning" | "destructive" | "outline" {
  if (score === null || maxScore <= 0) return "outline";
  const ratio = score / maxScore;
  if (ratio >= 0.75) return "success";
  if (ratio >= 0.5) return "warning";
  return "destructive";
}

function InfoCard({
  icon: Icon,
  label,
  tone,
  trailing,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: { soft: string; text: string };
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", tone.soft, tone.text)}>
          <Icon className="size-3.5" />
        </span>
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        {trailing ? <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{trailing}</span> : null}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** Baris ringkas jadwal berikutnya satu anak — dipakai di section appbar paling atas. */
function NextLessonRow({ child }: { child: ParentDashboard["children"][number] }) {
  const displayName = child.nickname || child.name;
  const lesson = child.nextLesson;
  const rowClassName = "flex items-center gap-3 rounded-2xl bg-background/70 px-3 py-2.5";

  const body = (
    <>
      <StudentAvatar name={child.name} color={child.color} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
        {lesson ? (
          <p className="truncate text-xs text-muted-foreground">
            {relativeDayLabel(lesson.date)} · {lesson.startTime.slice(0, 5)} · {lesson.programName}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Belum ada jadwal terdekat.</p>
        )}
      </div>
      {lesson ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
    </>
  );

  if (!lesson) return <div className={rowClassName}>{body}</div>;

  return (
    <Link
      href={`/parent/schedule/${lesson.id}`}
      className={cn(rowClassName, "transition-colors active:scale-[0.99] hover:bg-background")}
    >
      {body}
    </Link>
  );
}

/** Catatan ringkas laporan terakhir satu anak — dipakai di section note paling bawah. */
function LastReportNote({ child }: { child: ParentDashboard["children"][number] }) {
  if (!child.lastReport) return null;
  const displayName = child.nickname || child.name;

  return (
    <Link
      href={`/parent/schedule/${child.lastReport.id}`}
      className="-mx-1 flex items-start gap-2.5 rounded-lg border-b border-border/60 px-1 py-3 transition-colors last:border-0 hover:bg-muted/40"
    >
      <Quote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          {displayName} · {formatDateShort(child.lastReport.date)}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm text-foreground/90">
          {child.lastReport.text ?? child.lastReport.topicLabel ?? "Laporan belum diisi."}
        </p>
        <p className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-primary">
          Lihat detail
          <ChevronRight className="size-3.5" />
        </p>
      </div>
    </Link>
  );
}

function ChildCard({ child, index }: { child: ParentDashboard["children"][number]; index: number }) {
  const accent = accentOf(child.color);
  const meetingsThisPeriod = child.meetings.completed + child.meetings.scheduled;
  const displayName = child.nickname || child.name;

  return (
    <Card className="animate-rise overflow-hidden" style={{ animationDelay: `${index * 60}ms` }}>
      <div className={cn("h-1.5 w-full", accent.solid)} />
      <CardHeader className={cn("bg-gradient-to-br", accent.gradient)}>
        <div className="flex items-center gap-3">
          <StudentAvatar
            name={child.name}
            color={child.color}
            size="md"
            className={cn("ring-2 ring-offset-2 ring-offset-card", accent.ring)}
          />
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{displayName}</CardTitle>
          </div>
          {child.outstandingTotal > 0 ? (
            <Badge variant="warning" className="shrink-0">
              {formatCurrency(child.outstandingTotal)}
            </Badge>
          ) : (
            <Badge variant="success" className="shrink-0">
              Lunas
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2.5 pb-4">
        <InfoCard
          icon={FcReading}
          label="Pertemuan periode ini"
          tone={{ soft: accent.soft, text: accent.text }}
          trailing={`${formatDateShort(child.meetings.periodStart)} – ${formatDateShort(child.meetings.periodEnd)}`}
        >
          {meetingsThisPeriod > 0 ? (
            <>
              <p className="text-sm">
                <span className="font-semibold">{meetingsThisPeriod}</span> pertemuan
                {child.meetings.planned ? (
                  <>
                    {" "}dari <span className="font-semibold">{child.meetings.planned}</span> target
                  </>
                ) : null}
              </p>
              {child.meetings.planned ? (
                <ProgressBar
                  value={meetingsThisPeriod}
                  max={child.meetings.planned}
                  toneClassName={accent.solid}
                  className="mt-1.5"
                />
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {child.meetings.completed} selesai · {child.meetings.scheduled} terjadwal
                {child.meetings.cancelled > 0 ? ` · ${child.meetings.cancelled} batal` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada pertemuan pada periode ini.</p>
          )}
        </InfoCard>

        {child.lastLesson
          ? (() => {
              const badge = dateBadgeParts(child.lastLesson.date);
              return (
                <Link
                  href={`/parent/schedule/${child.lastLesson.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:bg-muted active:scale-[0.99]"
                >
                  <div className={cn("flex size-12 shrink-0 flex-col items-center justify-center rounded-xl", accent.soft, accent.text)}>
                    <span className="text-[9px] leading-none font-bold uppercase">{badge.month}</span>
                    <span className="text-lg leading-none font-black">{badge.day}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Terakhir belajar · {relativeDayLabel(child.lastLesson.date)}
                    </p>
                    <p className="truncate text-sm font-semibold text-foreground">
                      {child.lastLesson.topic ?? "Topik belum diisi"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              );
            })()
          : null}

        {child.lastAttempt
          ? (() => {
              const tone = attemptTone(child.lastAttempt.score, child.lastAttempt.maxScore);
              return (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md", accent.soft, accent.text)}>
                    <FcGraduationCap className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Hasil latihan</p>
                    <p className="truncate text-sm font-medium">
                      {child.lastAttempt.subject ?? child.lastAttempt.title}
                    </p>
                  </div>
                  <Badge variant={tone} className={cn(tone === "success" && "animate-pop")}>
                    {child.lastAttempt.score === null
                      ? "Belum dinilai"
                      : `${child.lastAttempt.score}/${child.lastAttempt.maxScore}`}
                  </Badge>
                </div>
              );
            })()
          : null}

        {child.lastPhoto ? (
          <InfoCard icon={FcCamera} label="Aktivitas belajar" tone={{ soft: accent.soft, text: accent.text }}>
            <a
              href={`/api/files/${child.lastPhoto.storageKey}`}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block overflow-hidden rounded-lg border border-border"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${child.lastPhoto.storageKey}`}
                alt={child.lastPhoto.originalName}
                className="h-40 w-full object-cover"
              />
            </a>
          </InfoCard>
        ) : null}

        <div className="flex gap-2 pt-1">
          <Link
            href={`/parent/reports?student=${child.studentId}`}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors active:scale-[0.98]",
              accent.soft,
              accent.text,
            )}
          >
            <FileText className="size-3.5" />
            Laporan
          </Link>
          <Link
            href={`/parent/invoices?student=${child.studentId}`}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors active:scale-[0.98]",
              child.outstandingTotal > 0 ? "bg-warning/20 text-warning-foreground" : "bg-muted text-foreground",
            )}
          >
            <Wallet className="size-3.5" />
            Tagihan
            <ChevronRight className="size-3.5 opacity-60" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function ParentHomePage() {
  const parent = await requireParent();
  const dashboard = await parentDashboard(parent.id);

  if (dashboard.children.length === 0) {
    return (
      <div className="flex flex-col gap-5 pt-2">
        <EmptyState
          icon={Sparkles}
          title="Belum ada anak yang terhubung"
          description="Minta pengajar mengirim ulang tautan undangan agar akun Anda terhubung dengan data anak."
          className="rounded-2xl border border-dashed border-border"
        />
      </div>
    );
  }

  const totalMeetings = dashboard.children.reduce(
    (sum, child) => sum + child.meetings.completed + child.meetings.scheduled,
    0,
  );
  const totalOutstanding = dashboard.children.reduce((sum, child) => sum + child.outstandingTotal, 0);

  const childrenWithReport = dashboard.children.filter((child) => child.lastReport);

  return (
    <div className="flex flex-col gap-5">
      <TopPanel>
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <FcCalendar className="size-3.5" />
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Jadwal berikutnya</p>
        </div>
        <div className="flex flex-col gap-2">
          {dashboard.children.map((child) => (
            <NextLessonRow key={child.studentId} child={child} />
          ))}
        </div>
      </TopPanel>

      {dashboard.children.length > 1 ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <FcConferenceCall className="mx-auto size-4" />
            <p className="mt-1 text-lg font-bold tabular-nums">{dashboard.children.length}</p>
            <p className="text-[10px] text-muted-foreground">Anak aktif</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <FcReading className="mx-auto size-4" />
            <p className="mt-1 text-lg font-bold tabular-nums">{totalMeetings}</p>
            <p className="text-[10px] text-muted-foreground">Pertemuan periode ini</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <FcPaid className="mx-auto size-4" />
            <p className="mt-1 text-lg font-bold tabular-nums">
              {totalOutstanding > 0 ? formatCurrency(totalOutstanding) : "Lunas"}
            </p>
            <p className="text-[10px] text-muted-foreground">Belum lunas</p>
          </div>
        </div>
      ) : null}

      {dashboard.children.map((child, index) => (
        <ChildCard key={child.studentId} child={child} index={index} />
      ))}

      {childrenWithReport.length > 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/50 px-3.5">
          <p className="pt-3.5 pb-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Laporan terakhir
          </p>
          <div className="flex flex-col">
            {childrenWithReport.map((child) => (
              <LastReportNote key={child.studentId} child={child} />
            ))}
          </div>
        </div>
      ) : null}

      <p className="px-1 text-center text-[11px] text-muted-foreground">
        Data diperbarui otomatis setiap pengajar menyimpan sesi les. Hari ini {formatDateLong(todayKey())}.
      </p>
    </div>
  );
}
