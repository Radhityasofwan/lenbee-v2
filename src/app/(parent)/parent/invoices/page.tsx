import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FcPaid } from "react-icons/fc";
import { ChildrenFilter } from "../../children-filter";
import { TopPanel } from "@/components/top-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StudentAvatar } from "@/components/student-avatar";
import { requireParent } from "@/lib/auth";
import { accessibleStudentIds, getStudentForUser } from "@/lib/authz";
import { accentOf } from "@/lib/domain/colors";
import { formatCurrency, formatDateShort } from "@/lib/datetime";
import { INVOICE_STATUS_LABELS, labelOf } from "@/lib/domain/labels";
import { invoicesForStudent } from "@/lib/services/invoices";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoice" };

function statusVariant(status: string): "success" | "warning" | "destructive" | "outline" {
  if (status === "paid") return "success";
  if (status === "partial") return "warning";
  if (status === "void") return "outline";
  return "destructive";
}

export default async function ParentInvoicesPage({ searchParams }: PageProps<"/parent/invoices">) {
  const user = await requireParent();
  const params = await searchParams;
  const requested = Number(params?.student);
  const selected = Number.isInteger(requested) && requested > 0 ? requested : null;

  const ids = await accessibleStudentIds(user);
  const visible = selected && ids.includes(selected) ? [selected] : ids;

  const children = await Promise.all(visible.map((id) => getStudentForUser(user, id)));
  const withInvoices = await Promise.all(
    children
      .filter((child): child is NonNullable<typeof child> => child !== null)
      .map(async (child) => ({ child, invoices: await invoicesForStudent(child.id) })),
  );

  const total = withInvoices.reduce(
    (sum, entry) =>
      sum + entry.invoices.filter((i) => i.status === "unpaid" || i.status === "partial").reduce((s, i) => s + (i.total - i.paidAmount), 0),
    0,
  );

  const options = withInvoices.map((entry) => ({ studentId: entry.child.id, name: entry.child.name, nickname: entry.child.nickname }));

  return (
    <div className="flex flex-col gap-5">
      <TopPanel
        className={cn(
          "bg-gradient-to-b",
          total > 0 ? "from-warning/20 to-warning/8" : "from-success/18 to-success/8",
        )}
      >
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Tagihan</p>
        <p className={cn("mt-1 text-2xl font-bold tabular-nums", total > 0 ? "text-warning-foreground" : "text-success")}>
          {total > 0 ? formatCurrency(total) : "Semua lunas"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {total > 0 ? "Belum dibayar. Bisa dicek per anak di bawah." : "Tidak ada tagihan yang perlu dibayar saat ini."}
        </p>
      </TopPanel>

      <ChildrenFilter basePath="/parent/invoices" options={options} selected={selected} />

      {withInvoices.every((entry) => entry.invoices.length === 0) ? (
        <EmptyState icon={FcPaid} title="Belum ada invoice" description="Tagihan les akan muncul di sini setelah pengajar membuatnya." />
      ) : (
        withInvoices.map(({ child, invoices }) => {
          if (invoices.length === 0) return null;
          const accent = accentOf(child.color);
          return (
            <section key={child.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <StudentAvatar name={child.name} color={child.color} size="xs" />
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{child.name}</h2>
              </div>
              <Card>
                <CardContent className="flex flex-col gap-0.5 p-1.5">
                  {invoices.map((invoice) => {
                    const due = invoice.total - invoice.paidAmount;
                    return (
                      <Link
                        key={invoice.id}
                        href={`/share/invoice/${invoice.publicToken}`}
                        className="flex flex-col gap-2 rounded-lg px-2.5 py-3 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", accent.soft, accent.text)}>
                            <FcPaid className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{invoice.invoiceNumber}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {formatDateShort(invoice.issueDate)}
                              {invoice.dueDate ? ` · jatuh tempo ${formatDateShort(invoice.dueDate)}` : ""}
                            </span>
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-sm font-semibold">{formatCurrency(invoice.total)}</span>
                            <Badge variant={statusVariant(invoice.status)}>{labelOf(INVOICE_STATUS_LABELS, invoice.status)}</Badge>
                          </span>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                          {due > 0 ? <span className="sr-only">Sisa {formatCurrency(due)}</span> : null}
                        </div>
                        {invoice.status === "partial" ? (
                          <div className="pl-11">
                            <ProgressBar value={invoice.paidAmount} max={invoice.total} toneClassName="bg-warning" />
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Dibayar {formatCurrency(invoice.paidAmount)} dari {formatCurrency(invoice.total)}
                            </p>
                          </div>
                        ) : null}
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
