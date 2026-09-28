import {
  Bot,
  CalendarCheck,
  CalendarDays,
  FileWarning,
  Users,
  Wallet,
} from "lucide-react";
import { FcBookmark, FcCalendar, FcComments, FcDocument, FcHighPriority, FcPaid, FcTodoList } from "react-icons/fc";
import Link from "next/link";
import { LessonRow } from "@/components/lesson/lesson-row";
import { StudentAvatar } from "@/components/student-avatar";
import { TopPanel } from "@/components/top-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { requireTutor } from "@/lib/auth";
import { INVOICE_STATUS_LABELS, labelOf } from "@/lib/domain/labels";
import { formatCurrency, formatDateShort, pluralize, todayKey } from "@/lib/datetime";
import { assignmentsForTutor } from "@/lib/services/assignments";
import { tutorDashboard } from "@/lib/services/stats";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

/** 4 pintasan terpenting selain yang sudah ada di navbar bawah (Beranda/Anak/Jadwal/Latihan). */
const SHORTCUTS = [
  { href: "/reports", label: "Laporan", icon: FcComments },
  { href: "/invoices", label: "Invoice", icon: FcPaid },
  { href: "/documents", label: "Dokumen", icon: FcDocument },
  { href: "/bank-soal", label: "Bank Soal", icon: FcBookmark },
];

export default async function TutorHomePage() {
  const user = await requireTutor();
  const [data, activeAssignments] = await Promise.all([
    tutorDashboard(user.id),
    assignmentsForTutor(user.id, { status: "published", orderBy: "updatedAt", limit: 5 }),
  ]);
  const today = todayKey();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-5">
      <TopPanel>
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="text-2xl font-bold tracking-tight">{firstName}</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {data.stats.studentsActive === 0
            ? "Tambahkan murid pertama Anda untuk mulai mencatat pertemuan."
            : `${pluralize(data.stats.studentsActive, "murid")} aktif · ${pluralize(data.today.length, "pertemuan")} hari ini`}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-sm font-bold">Hari ini</h2>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Link href="/schedule">Lihat jadwal</Link>
          </Button>
        </div>

        {data.today.length === 0 ? (
          <EmptyState
            icon={FcCalendar}
            title="Tidak ada pertemuan hari ini"
            description="Nikmati waktu luang, atau tambahkan sesi tambahan dari halaman jadwal."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/schedule">Buka jadwal</Link>
              </Button>
            }
          />
        ) : (
          <div className="mt-2 flex flex-col gap-2.5">
            {data.today.map((entry) => (
              <LessonRow key={entry.lesson.id} entry={entry} />
            ))}
          </div>
        )}
      </TopPanel>

      <section className="grid grid-cols-4 gap-2">
        {SHORTCUTS.map((item) => (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5">
            <span className="flex size-14 items-center justify-center rounded-[22px] bg-primary/10 text-primary transition-colors active:bg-primary/15">
              <item.icon className="size-6" />
            </span>
            <span className="text-center text-[11px] font-medium text-foreground">{item.label}</span>
          </Link>
        ))}
      </section>

      {data.upcoming.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-sm font-bold">Akan datang</h2>
          <div className="flex flex-col gap-2.5">
            {data.upcoming.slice(0, 5).map((entry) => (
              <LessonRow key={entry.lesson.id} entry={entry} showDate />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard
          label="Anak aktif"
          value={data.stats.studentsActive}
          hint="Sedang les"
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Jadwal minggu ini"
          value={data.stats.lessonsThisWeek}
          hint="Pertemuan terjadwal"
          icon={CalendarDays}
          tone="default"
        />
        <StatCard
          label="Pertemuan bulan ini"
          value={data.stats.completedThisMonth}
          hint={`${data.stats.lessonsThisMonth} terjadwal`}
          icon={CalendarCheck}
          tone="primary"
        />
        <StatCard
          label="Menunggu laporan"
          value={data.stats.pendingReports}
          hint={data.stats.pendingReports > 0 ? "Perlu ditulis" : "Semua beres"}
          icon={FileWarning}
          tone={data.stats.pendingReports > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Piutang"
          value={formatCurrency(data.stats.outstandingTotal)}
          hint={`${data.openInvoices.length} tagihan terbuka`}
          icon={Wallet}
          tone={data.stats.outstandingTotal > 0 ? "destructive" : "success"}
        />
        <StatCard
          label="Kehadiran"
          value={data.stats.attendanceRate === null ? "—" : `${data.stats.attendanceRate}%`}
          hint="Bulan ini"
          icon={CalendarDays}
          tone="default"
        />
      </div>

      {data.studentsNeedingAttention.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FcHighPriority className="size-4" />
              Perlu perhatian
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.studentsNeedingAttention.map((student) => (
              <Link
                key={student.id}
                href={`/students/${student.id}`}
                className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted"
              >
                <StudentAvatar name={student.name} color={student.color} size="xs" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {student.nickname || student.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {student.daysSince === null ? "Belum pernah les" : `${student.daysSince} hari lalu`}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {data.openInvoices.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <FcPaid className="size-4" />
              Tagihan belum lunas
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <Link href="/invoices">Semua</Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.openInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{invoice.studentName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {invoice.invoiceNumber}
                    {invoice.dueDate ? ` · jatuh tempo ${formatDateShort(invoice.dueDate)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-bold tabular-nums">{formatCurrency(invoice.total)}</span>
                  <Badge variant={invoice.status === "partial" ? "warning" : "destructive"} className="text-[10px]">
                    {labelOf(INVOICE_STATUS_LABELS, invoice.status)}
                  </Badge>
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Latihan aktif</h2>
          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Link href="/assignments">Semua</Link>
          </Button>
        </div>

        {activeAssignments.length === 0 ? (
          <EmptyState
            icon={FcTodoList}
            title="Belum ada latihan aktif"
            description="Terbitkan tugas dari halaman Latihan supaya murid bisa mulai mengerjakan."
          />
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-1 p-1.5">
              {activeAssignments.map((item) => (
                <Link
                  key={item.assignment.id}
                  href={`/assignments/${item.assignment.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                >
                  <StudentAvatar name={item.studentName} color={item.studentColor} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.assignment.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.studentNickname || item.studentName}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.attemptCount > 0 ? `${item.attemptCount} kerja` : "Belum dikerjakan"}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <p className="pb-2 text-center text-xs text-muted-foreground">Hari ini {formatDateShort(today)}</p>

      <Link
        href="/asisten"
        aria-label="Buka Asisten AI"
        className="animate-fab-in fixed top-[calc(env(safe-area-inset-top,0px)+5rem)] right-0 z-30 flex h-14 w-11 items-center justify-center rounded-l-2xl border border-r-0 border-border/40 bg-primary/70 text-primary-foreground shadow-md shadow-black/10 backdrop-blur-md transition-transform duration-200 supports-[backdrop-filter]:bg-primary/55 active:scale-90 motion-reduce:animate-none motion-reduce:transition-none motion-reduce:active:scale-100 dark:shadow-black/30"
      >
        <Bot className="size-5" />
      </Link>
    </div>
  );
}
