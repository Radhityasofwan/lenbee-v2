import { Paperclip, Search } from "lucide-react";
import { FcDocument } from "react-icons/fc";
import Link from "next/link";
import { DocumentActions } from "@/components/document/document-actions";
import { DocumentUploadDialog } from "@/components/document/document-upload-dialog";
import { StudentAvatar } from "@/components/student-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { formatDateShort, pluralize, toDateKey } from "@/lib/datetime";
import { DOCUMENT_CATEGORY_LABELS, labelOf } from "@/lib/domain/labels";
import { documentsForTutor, type DocumentCategory } from "@/lib/services/documents";
import { activeProgramsForTutor, listStudents } from "@/lib/services/students";

const CATEGORIES = Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[];

function isCategory(value: unknown): value is DocumentCategory {
  return typeof value === "string" && CATEGORIES.includes(value as DocumentCategory);
}

function fileUrl(storageKey: string): string {
  return `/api/files/${storageKey.split("/").map(encodeURIComponent).join("/")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function filterHref(category?: string, studentId?: string, search?: string): string {
  const query = new URLSearchParams();
  if (category) query.set("category", category);
  if (studentId) query.set("studentId", studentId);
  if (search) query.set("q", search);
  const suffix = query.toString();
  return suffix ? `/documents?${suffix}` : "/documents";
}

export default async function DocumentsPage(props: PageProps<"/documents">) {
  const user = await requireTutor();
  const params = await props.searchParams;

  const search = typeof params.q === "string" ? params.q : "";
  const category = isCategory(params.category) ? params.category : undefined;
  const studentId =
    typeof params.studentId === "string" && Number.isInteger(Number(params.studentId))
      ? Number(params.studentId)
      : undefined;

  const [documents, students, programs] = await Promise.all([
    documentsForTutor(user.id, { search, category, studentId }),
    listStudents(user.id, {}),
    activeProgramsForTutor(user.id),
  ]);

  const hasFilter = Boolean(search || category || studentId);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Dokumen"
        description={`${pluralize(documents.length, "dokumen")} tersimpan`}
        action={
          <DocumentUploadDialog
            students={students.map((student) => ({
              id: student.id,
              name: student.name,
              nickname: student.nickname,
            }))}
            programs={programs.map((program) => ({
              id: program.id,
              name: program.name,
              studentId: program.studentId,
            }))}
          />
        }
      />

      <form method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search}
            placeholder="Cari judul, tag materi, atau nama berkas…"
            className="pl-9"
            aria-label="Cari dokumen"
          />
        </div>
        {category ? <input type="hidden" name="category" value={category} /> : null}
        {studentId ? <input type="hidden" name="studentId" value={studentId} /> : null}
        <Button type="submit" variant="outline">
          Cari
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button asChild size="sm" variant={category ? "ghost" : "secondary"}>
          <Link href={filterHref(undefined, studentId ? String(studentId) : undefined, search)}>Semua</Link>
        </Button>
        {CATEGORIES.map((value) => (
          <Button key={value} asChild size="sm" variant={category === value ? "secondary" : "ghost"}>
            <Link href={filterHref(value, studentId ? String(studentId) : undefined, search)}>
              {DOCUMENT_CATEGORY_LABELS[value]}
            </Link>
          </Button>
        ))}
      </div>

      {hasFilter ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Filter aktif</span>
          <Link href="/documents" className="font-medium text-primary hover:underline">
            Reset filter
          </Link>
        </div>
      ) : null}

      {documents.length === 0 ? (
        <EmptyState
          icon={FcDocument}
          title={hasFilter ? "Tidak ada dokumen yang cocok" : "Belum ada dokumen"}
          description={
            hasFilter
              ? "Coba kata kunci atau filter lain."
              : "Unggah worksheet, soal, atau rangkuman agar mudah dipakai ulang saat mengajar."
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {documents.map(({ document: doc, studentName, studentNickname, studentColor, programName }) => (
            <div
              key={doc.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40"
            >
              {studentName ? (
                <StudentAvatar name={studentName} color={studentColor ?? undefined} size="md" />
              ) : (
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Paperclip className="size-4" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={fileUrl(doc.storageKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-sm font-bold hover:underline"
                  >
                    {doc.title}
                  </a>
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {labelOf(DOCUMENT_CATEGORY_LABELS, doc.category)}
                  </Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    studentName ? studentNickname || studentName : null,
                    programName,
                    doc.materialTag,
                  ]
                    .filter(Boolean)
                    .join(" · ") || doc.originalName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {formatBytes(doc.size)} · {formatDateShort(toDateKey(doc.createdAt))}
                </p>
              </div>

              <DocumentActions
                document={{
                  id: doc.id,
                  title: doc.title,
                  description: doc.description,
                  studentId: doc.studentId,
                  programId: doc.programId,
                  materialTag: doc.materialTag,
                  category: doc.category,
                }}
                students={students.map((student) => ({
                  id: student.id,
                  name: student.name,
                  nickname: student.nickname,
                }))}
                programs={programs.map((program) => ({
                  id: program.id,
                  name: program.name,
                  studentId: program.studentId,
                }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
