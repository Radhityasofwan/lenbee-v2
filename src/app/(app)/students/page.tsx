import { Search } from "lucide-react";
import { FcConferenceCall } from "react-icons/fc";
import Link from "next/link";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { formatDateShort, pluralize, relativeDayLabel } from "@/lib/datetime";
import { listStudents } from "@/lib/services/students";

export default async function StudentsPage(props: PageProps<"/students">) {
  const user = await requireTutor();
  const params = await props.searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const includeInactive = params.status === "all";

  const students = await listStudents(user.id, { search, includeInactive });

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Murid"
        description={`${pluralize(students.length, "murid")}${includeInactive ? "" : " aktif"}`}
        action={
          <Button asChild size="sm">
            <Link href="/students/new">Tambah</Link>
          </Button>
        }
      />

      <form method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search}
            placeholder="Cari nama, sekolah, orang tua…"
            className="pl-9"
            aria-label="Cari murid"
          />
        </div>
        {includeInactive ? <input type="hidden" name="status" value="all" /> : null}
        <Button type="submit" variant="outline">
          Cari
        </Button>
      </form>

      <div className="flex items-center justify-between text-xs">
        <Link
          href={includeInactive ? `/students${search ? `?q=${encodeURIComponent(search)}` : ""}` : `/students?status=all`}
          className="font-medium text-primary hover:underline"
        >
          {includeInactive ? "Sembunyikan murid nonaktif" : "Tampilkan murid nonaktif"}
        </Link>
        {search ? (
          <Link href="/students" className="text-muted-foreground hover:underline">
            Reset pencarian
          </Link>
        ) : null}
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={FcConferenceCall}
          title={search ? "Tidak ada murid yang cocok" : "Belum ada murid"}
          description={
            search
              ? "Coba kata kunci lain atau reset pencarian."
              : "Tambahkan murid pertama Anda, lalu buat jadwal lesnya."
          }
          action={
            <Button asChild size="sm">
              <Link href="/students/new">Tambah murid</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/50"
            >
              <StudentAvatar name={student.name} color={student.color} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold">{student.name}</p>
                  {student.isActive ? null : (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      Nonaktif
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[student.school, student.grade ? `Kelas ${student.grade}` : null]
                    .filter(Boolean)
                    .join(" · ") || student.parentName || "—"}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {student.programCount > 0
                    ? pluralize(student.programCount, "program")
                    : "Belum ada program"}
                  {student.nextLessonDate
                    ? ` · ${relativeDayLabel(student.nextLessonDate)}`
                    : student.lastLessonDate
                      ? ` · terakhir ${formatDateShort(student.lastLessonDate)}`
                      : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
