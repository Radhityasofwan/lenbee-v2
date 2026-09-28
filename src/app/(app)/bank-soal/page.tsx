import { Search } from "lucide-react";
import { FcBookmark } from "react-icons/fc";
import Link from "next/link";
import type { Metadata } from "next";
import { BankQuestionItem } from "@/components/bank/bank-question-item";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireTutor } from "@/lib/auth";
import { pluralize } from "@/lib/datetime";
import { QUESTION_TYPE_LABELS } from "@/lib/domain/labels";
import { bankFacets, listBankQuestions, type BankQuestionFilters } from "@/lib/services/question-bank";

export const metadata: Metadata = { title: "Bank Soal" };

const TYPES = Object.keys(QUESTION_TYPE_LABELS) as (keyof typeof QUESTION_TYPE_LABELS)[];

function filterHref(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? `/bank-soal?${suffix}` : "/bank-soal";
}

export default async function BankSoalPage(props: PageProps<"/bank-soal">) {
  const tutor = await requireTutor();
  const params = await props.searchParams;

  const search = typeof params.q === "string" ? params.q : "";
  const subject = typeof params.subject === "string" ? params.subject : undefined;
  const grade = typeof params.grade === "string" ? params.grade : undefined;
  const type = TYPES.includes(params.type as never) ? (params.type as BankQuestionFilters["type"]) : undefined;

  const [facets, questions] = await Promise.all([
    bankFacets(tutor.id),
    listBankQuestions(tutor.id, { search, subject, grade, type }),
  ]);

  const hasFilter = Boolean(search || subject || grade || type);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Bank Soal" description={`${pluralize(questions.length, "soal")} tersimpan`} />

      <form method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search}
            placeholder="Cari materi/bab atau isi soal…"
            className="pl-9"
            aria-label="Cari soal"
          />
        </div>
        {subject ? <input type="hidden" name="subject" value={subject} /> : null}
        {grade ? <input type="hidden" name="grade" value={grade} /> : null}
        {type ? <input type="hidden" name="type" value={type} /> : null}
        <Button type="submit" variant="outline">
          Cari
        </Button>
      </form>

      {facets.subjects.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button asChild size="sm" variant={subject ? "ghost" : "secondary"}>
            <Link href={filterHref({ grade, type, q: search })}>Semua mapel</Link>
          </Button>
          {facets.subjects.map((value) => (
            <Button key={value} asChild size="sm" variant={subject === value ? "secondary" : "ghost"}>
              <Link href={filterHref({ subject: value, grade, type, q: search })}>{value}</Link>
            </Button>
          ))}
        </div>
      ) : null}

      {facets.grades.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button asChild size="sm" variant={grade ? "ghost" : "secondary"}>
            <Link href={filterHref({ subject, type, q: search })}>Semua kelas</Link>
          </Button>
          {facets.grades.map((value) => (
            <Button key={value} asChild size="sm" variant={grade === value ? "secondary" : "ghost"}>
              <Link href={filterHref({ subject, grade: value, type, q: search })}>{value}</Link>
            </Button>
          ))}
        </div>
      ) : null}

      {hasFilter ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Filter aktif</span>
          <Link href="/bank-soal" className="font-medium text-primary hover:underline">
            Reset filter
          </Link>
        </div>
      ) : null}

      {questions.length === 0 ? (
        <EmptyState
          icon={FcBookmark}
          title={hasFilter ? "Tidak ada soal yang cocok" : "Bank Soal masih kosong"}
          description={
            hasFilter
              ? "Coba kata kunci atau filter lain."
              : "Simpan soal dari halaman Tugas (tombol “Simpan ke Bank”) supaya bisa dipakai ulang lain kali."
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {questions.map((question) => (
            <BankQuestionItem key={question.id} question={question} />
          ))}
        </div>
      )}
    </div>
  );
}
