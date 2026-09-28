import { ArrowUpRight, Search } from "lucide-react";
import { FcPaid } from "react-icons/fc";
import Link from "next/link";
import type { Metadata } from "next";
import { GenerateInvoiceDialog } from "@/components/invoice/generate-invoice-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StudentAvatar } from "@/components/student-avatar";
import { requireTutor } from "@/lib/auth";
import { formatCurrency, formatDateShort } from "@/lib/datetime";
import { INVOICE_STATUS_LABELS, labelOf } from "@/lib/domain/labels";
import { invoicesForTutor } from "@/lib/services/invoices";
import { listStudents } from "@/lib/services/students";
import type { Invoice } from "@/db/schema";

export const metadata: Metadata = { title: "Invoice" };

const STATUSES = Object.keys(INVOICE_STATUS_LABELS) as Invoice["status"][];

function isStatus(value: unknown): value is Invoice["status"] {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

function statusTone(status: Invoice["status"]): "secondary" | "info" | "success" | "warning" {
  if (status === "paid") return "success";
  if (status === "partial") return "info";
  if (status === "void") return "secondary";
  return "warning";
}

function filterHref(params: { status?: string; studentId?: number; outstanding?: boolean }) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.studentId) search.set("studentId", String(params.studentId));
  if (params.outstanding) search.set("outstanding", "1");
  const query = search.toString();
  return query ? `/invoices?${query}` : "/invoices";
}

export default async function InvoicesPage(props: PageProps<"/invoices">) {
  const user = await requireTutor();
  const params = await props.searchParams;

  const status = isStatus(params.status) ? params.status : undefined;
  const studentId =
    typeof params.studentId === "string" && Number.isInteger(Number(params.studentId))
      ? Number(params.studentId)
      : undefined;
  const outstanding = params.outstanding === "1";

  const [invoices, students] = await Promise.all([
    invoicesForTutor(user.id, { status, studentId, onlyOutstanding: outstanding }),
    listStudents(user.id, {}),
  ]);

  const studentOptions = students.map((student) => ({
    id: student.id,
    name: student.name,
    nickname: student.nickname,
    periodStart: student.periodStart,
  }));
  const hasFilter = Boolean(status || studentId || outstanding);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Invoice"
        description="Tagihan dari pertemuan yang sudah selesai."
        action={
          studentOptions.length > 0 ? <GenerateInvoiceDialog students={studentOptions} /> : undefined
        }
      />

      <form className="flex items-center gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        {outstanding ? <input type="hidden" name="outstanding" value="1" /> : null}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <select
            name="studentId"
            defaultValue={studentId ? String(studentId) : ""}
            className="h-9 w-full rounded-lg border border-input bg-transparent pr-3 pl-9 text-sm"
          >
            <option value="">Semua murid</option>
            {studentOptions.map((student) => (
              <option key={student.id} value={String(student.id)}>
                {student.nickname || student.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm" variant="outline">
          Filter
        </Button>
      </form>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <Link href={filterHref({ studentId, outstanding })} className="shrink-0">
          <Badge variant={status ? "outline" : "default"}>Semua</Badge>
        </Link>
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={filterHref({ status: value, studentId, outstanding })}
            className="shrink-0"
          >
            <Badge variant={status === value ? "default" : "outline"}>
              {INVOICE_STATUS_LABELS[value]}
            </Badge>
          </Link>
        ))}
        <Link
          href={filterHref({ status, studentId, outstanding: !outstanding })}
          className="shrink-0"
        >
          <Badge variant={outstanding ? "default" : "outline"}>Belum lunas</Badge>
        </Link>
      </div>

      {hasFilter ? (
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
            <Link href="/invoices">Reset filter</Link>
          </Button>
        </div>
      ) : null}

      {invoices.length === 0 ? (
        <EmptyState
          icon={FcPaid}
          title={hasFilter ? "Tidak ada invoice yang cocok" : "Belum ada invoice"}
          description={
            hasFilter
              ? "Coba ubah atau reset filter untuk melihat invoice lainnya."
              : "Buat invoice dari pertemuan yang sudah selesai pada periode tertentu."
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {invoices.map(({ invoice, studentName, studentNickname, studentColor }) => (
            <Link
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              className="rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <StudentAvatar name={studentName} color={studentColor} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {studentNickname || studentName}
                    </span>
                    <Badge variant={statusTone(invoice.status)} className="shrink-0">
                      {labelOf(INVOICE_STATUS_LABELS, invoice.status)}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Terbit {formatDateShort(invoice.issueDate)}
                    {invoice.dueDate ? ` · jatuh tempo ${formatDateShort(invoice.dueDate)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrency(invoice.total)}
                  </span>
                  {invoice.status === "partial" ? (
                    <span className="text-[11px] text-muted-foreground">
                      dibayar {formatCurrency(invoice.paidAmount)}
                    </span>
                  ) : null}
                  <ArrowUpRight className="size-3.5 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
